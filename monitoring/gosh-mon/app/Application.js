"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const DummyHandler_1 = __importDefault(require("./Handlers/DummyHandler"));
const PrometheusFormatter_1 = __importDefault(require("./PrometheusFormatter"));
const redis_smq_1 = require("redis-smq");
const fs_1 = __importDefault(require("fs"));
const Utils_1 = require("./Utils");
const redis_smq_monitor_1 = require("redis-smq-monitor");
class Application {
    constructor() {
        this.interval = 50;
        this.lastFetched = 0;
        this.lastResult = -1;
        this.debug = false;
        this.steps = false;
        this.mode = "";
        this.rq_host = "";
        this.rq_prod = false;
        this.rq_cons = false;
        this.rev_msg_ttl = 10000;
        this.rev_clr_logs = 3600000;
        this.busy = false;
        this.app = (0, express_1.default)();
        this.baseHandlerFactory = this.handlerFactory = (silent) => new DummyHandler_1.default();
        this.promformatter = new PrometheusFormatter_1.default();
    }
    setInterval(interval) {
        this.interval = interval;
    }
    setDebug(debug) {
        this.debug = debug;
    }
    async inquiry(debug = false, cli = false) {
        const handler = this.handlerFactory().setApplication(this).setDebug(this.debug || debug);
        const result = (debug || cli) ? await handler.handle(debug) : await handler.cachingHandle();
        handler.finalize();
        if (result.has('result'))
            this.lastResult = result.get('result');
        return this.promformatter.process(result, debug, this.debug || debug);
    }
    async prepare() {
        try {
            if (this.rq_prod) {
                await this.prepareProducer();
            }
        }
        catch (e) {
            // Do not want tests to not work at all because of redis (smq) problems
            console.error('Failed initialising Redis SMQ producer, reverb functionality will not work', e);
            this.producer = undefined;
        }
        if (this.rq_cons) {
            await this.prepareConsumer();
            return;
        }
        this.app.use(function (req, res, next) {
            console.log(req.socket.remoteAddress + ' ' + req.method + ' ' + req.path);
            next();
        });
        this.app.get('/', (req, res) => {
            res.send('<h1>Gosh monitoring</h1><a href="/metrics">Prometheus metrics</a>');
        });
        this.app.get('/metrics', async (req, res) => {
            res.send(await this.inquiry(false));
        });
    }
    async run(port = 9600) {
        if (this.rq_cons) {
            await this.runConsumer();
            console.log('GOSH reverb retrier started for mode ' + this.mode);
            return;
        }
        this.app.listen(port, () => {
            console.log('GOSH monitoring service started on port ' + port + ' for mode ' + this.mode);
            console.log('Handler: ' + this.handlerFactory().describe() + ', Prefix: ' + this.promformatter.prefix);
        });
    }
    rqConfig() {
        return {
            namespace: 'gosh-mon',
            redis: {
                client: 'ioredis',
                options: {
                    host: this.rq_host
                },
            },
            eventListeners: {
                consumerEventListeners: [redis_smq_monitor_1.ConsumerEventListener],
                producerEventListeners: [redis_smq_monitor_1.ProducerEventListener],
            }
        };
    }
    async createQueue() {
        await new Promise((resolve, reject) => {
            redis_smq_1.QueueManager.createInstance(this.rqConfig(), (err, queueManager) => {
                if (err)
                    reject(err);
                else
                    queueManager.queue.create(this.mode, false, (err) => {
                        if (err?.name == 'QueueExistsError')
                            resolve(0);
                        else if (err)
                            reject(err);
                        else
                            resolve(0);
                    });
            });
        });
    }
    async prepareProducer() {
        await this.createQueue();
        this.producer = new redis_smq_1.Producer(this.rqConfig());
        await new Promise((resolve, reject) => {
            this.producer.run((err) => {
                if (err)
                    reject(err);
                else
                    resolve(0);
            });
        });
    }
    async maybeProduce(c) {
        if (!this.producer)
            return;
        const m = new redis_smq_1.Message();
        m.setBody(c).setTTL(this.rev_msg_ttl).setQueue(this.mode);
        return await new Promise((resolve, reject) => {
            this.producer.produce(m, (err) => {
                if (err)
                    reject(err);
                else
                    resolve(m.getId());
            });
        });
    }
    async prepareConsumer() {
        await this.createQueue();
        this.consumer = new redis_smq_1.Consumer(this.rqConfig());
        const messageHandler = (msg, cb) => {
            if (this.busy) {
                console.log('Dropping incoming message (still busy)');
                cb();
                return;
            }
            this.busy = true;
            const c = msg.getBody();
            for (let k of Object.keys(c)) {
                // for ex: reverb__pull_verbosity -> pull_verbosity override
                if (k.startsWith('reverb__'))
                    c[k.slice(8)] = c[k];
            }
            cb();
            this.cleanupOldLogs();
            console.log('Start processing incoming message');
            this.baseHandlerFactory().applyConfiguration(c).setApplication(this).setDebug(false).mkdirs(`errors/${this.mode}`)
                .logToFile(`errors/${this.mode}/${(0, Utils_1.niso)()}.log`).handle(false).finally(() => this.busy = false)
                .then(() => console.log('Done processing incoming message'))
                .catch((reason) => console.warn('Fail processing incoming message:', reason));
        };
        await new Promise((resolve, reject) => {
            this.consumer.consume(this.mode, messageHandler, (err) => {
                if (err)
                    reject(err);
                else
                    resolve(0);
            });
        });
    }
    async runConsumer() {
        console.log(`Old logs are deleted after ${this.rev_clr_logs / 1000} seconds`);
        await new Promise((resolve, reject) => {
            this.consumer.run((err, status) => {
                if (err)
                    reject(err);
                else {
                    if (status)
                        resolve(0);
                    else
                        reject(status);
                }
            });
        });
    }
    cleanupOldLogs() {
        const dir = `errors/${this.mode}`;
        if (!fs_1.default.existsSync(dir))
            return;
        fs_1.default.readdirSync(dir).forEach(file => {
            // @ts-ignore using ctime as a number, whatever!
            if (fs_1.default.statSync(`${dir}/${file}`).ctime < (0, Utils_1.nowms)() - this.rev_clr_logs)
                fs_1.default.unlinkSync(`${dir}/${file}`);
        });
    }
}
exports.default = Application;
