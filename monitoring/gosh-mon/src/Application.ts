import express, { Express, Request, Response } from 'express';
import Handler from "./Handler";
import DummyHandler from "./Handlers/DummyHandler";
import PrometheusFormatter, {MetricsMap} from "./PrometheusFormatter";
import {Consumer, Message, Producer, QueueManager} from "redis-smq";
import fs from "fs";
import {ICallback} from "redis-smq-common/dist/types";
import {niso, nowms} from "./Utils";
import {ConsumerEventListener, ProducerEventListener} from "redis-smq-monitor";

export default class Application {

    app: Express;
    baseHandlerFactory: ((silent?: boolean) => Handler);
    handlerFactory: ((silent?: boolean) => Handler);
    promformatter: PrometheusFormatter;

    interval: number = 50;
    lastFetched: number = 0;
    lastMetrics?: MetricsMap;

    lastResult: number = -1;

    debug: boolean = false;
    steps: boolean = false;

    mode: string = "";
    rq_host: string = "";
    rq_prod: boolean = false;
    rq_cons: boolean = false;

    producer?: Producer;
    consumer?: Consumer;

    rev_msg_ttl: number = 10_000;
    rev_clr_old_logs: number = 0;
    rev_clr_total_mb: number = 0;
    rev_clr_file_cnt: number = 0;
    busy: boolean = false;

    setInterval(interval: number) {
        this.interval = interval;
    }

    setDebug(debug: boolean) {
        this.debug = debug;
    }

    constructor() {
        this.app = express();
        this.baseHandlerFactory = this.handlerFactory = (silent?: boolean) => new DummyHandler();
        this.promformatter = new PrometheusFormatter();
    }

    async inquiry(debug: boolean = false, cli: boolean = false): Promise<string> {
        const handler = this.handlerFactory().setApplication(this).setDebug(this.debug || debug);
        const result = (debug || cli) ? await handler.handle(debug) : await handler.cachingHandle();
        handler.finalize();
        if (result.has('result'))
            this.lastResult = result.get('result')!;
        return this.promformatter.process(result, debug, this.debug || debug);
    }

    async prepare() {
        try {
            if (this.rq_prod) {
                await this.prepareProducer();
            }
        } catch (e) {
            // Do not want tests to not work at all because of redis (smq) problems
            console.error('Failed initialising Redis SMQ producer, reverb functionality will not work', e);
            this.producer = undefined;
        }

        if (this.rq_cons) {
            await this.prepareConsumer();
            return;
        }

        this.app.use(function (req: Request, res:Response, next) {
            console.log(req.socket.remoteAddress + ' ' + req.method + ' ' + req.path);
            next();
        });

        this.app.get('/', (req: Request, res: Response) => {
            res.send('<h1>Gosh monitoring</h1><a href="/metrics">Prometheus metrics</a>');
        });

        this.app.get('/metrics', async (req: Request, res: Response) => {
            res.send(await this.inquiry(false));
        });
    }

    async run(port: number = 9600) {
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

    rqConfig(): any {
        return {
            namespace: 'gosh-mon',
            redis: {
                client: 'ioredis',
                options: {
                    host: this.rq_host
                },
            },
            eventListeners: {
                consumerEventListeners: [ConsumerEventListener],
                producerEventListeners: [ProducerEventListener],
            }
        }
    }

    async createQueue() {
        await new Promise((resolve, reject) => {
            QueueManager.createInstance(this.rqConfig(), (err, queueManager) => {
                if (err) reject(err);
                else queueManager!.queue.create(this.mode, false, (err) => {
                    if (err?.name == 'QueueExistsError') resolve(0);
                    else if (err) reject(err); else resolve(0);
                });
            })
        });
    }

    async prepareProducer() {
        await this.createQueue();
        this.producer = new Producer(this.rqConfig());
        await new Promise((resolve, reject) => {
            this.producer!.run((err) => {
                if (err) reject(err); else resolve(0);
            })
        });
    }

    async maybeProduce(c: any) {
        if (!this.producer) return;
        const m = new Message();
        m.setBody(c).setTTL(this.rev_msg_ttl).setQueue(this.mode);
        return await new Promise((resolve, reject) => {
            this.producer!.produce(m, (err) => {
                if (err) reject(err); else resolve(m.getId());
            });
        });
    }

    async prepareConsumer() {
        await this.createQueue();

        this.consumer = new Consumer(this.rqConfig());

        const messageHandler = (msg: Message, cb: ICallback<void>) => {
            if (this.busy) {
                console.log('Dropping incoming message (still busy)');
                cb();
                return;
            }
            this.busy = true;
            const c: any = msg.getBody();
            for (let k of Object.keys(c)) {
                // for ex: reverb__pull_verbosity -> pull_verbosity override
                if (k.startsWith('reverb__'))
                    c[k.slice(8)] = c[k];
            }
            cb();
            this.cleanupLogs();
            console.log('Start processing incoming message');
            this.baseHandlerFactory().applyConfiguration(c).setApplication(this).setDebug(false).mkdirs(`errors/${this.mode}`)
                .logToFile(`errors/${this.mode}/${niso()}.log`).handle(false).finally(() => this.busy = false)
                .then(() => console.log('Done processing incoming message'))
                .catch((reason) => console.warn('Fail processing incoming message:', reason));
        };

        await new Promise((resolve, reject) => {
            this.consumer!.consume(this.mode, messageHandler, (err) => {
                if (err) reject(err); else resolve(0);
            });
        });
    }

    async runConsumer() {
        if (this.rev_clr_old_logs > 0)
            console.log(`Old logs are deleted after ${this.rev_clr_old_logs/1000} seconds`);
        await new Promise((resolve, reject) => {
            this.consumer!.run((err, status) => {
                if (err) reject(err); else { if (status) resolve(0); else reject(status); }
            })
        })
    }

    cleanupLogs() {
        const dir = `errors/${this.mode}`;
        if (!fs.existsSync(dir)) return;
        const files: any[] = [];
        if (this.rev_clr_old_logs > 0)
            fs.readdirSync(dir).forEach(file => {
                const stat = fs.statSync(`${dir}/${file}`);
                // @ts-ignore using ctime as a number, whatever!
                if (stat.ctime < nowms() - this.rev_clr_old_logs)
                    fs.unlinkSync(`${dir}/${file}`);
                else {
                    files.push({
                        name: file,
                        size: stat.size,
                        ctime: stat.ctime
                    });
                }
            });
        files.sort((a, b) => a.ctime - b.ctime);
        if (this.rev_clr_file_cnt > 0) {
            while (files.length > this.rev_clr_file_cnt) {
                fs.unlinkSync(files.shift().name);
            }
        }
        if (this.rev_clr_total_mb > 0) {
            const max_total = this.rev_clr_total_mb * 1024 * 1024;
            let total = files.reduce((previousValue, currentValue) => previousValue + currentValue.size, 0);
            while (total > max_total) {
                const first = files.shift();
                fs.unlinkSync(first.name);
                total -= first.size;
            }
        }
    }

}
