"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Config_1 = __importDefault(require("./Config"));
const Presentation_1 = __importDefault(require("./Presentation"));
const Loader_1 = __importDefault(require("./Loader"));
const Utils_1 = require("./Utils");
class Application {
    express;
    config;
    service;
    loader;
    storage;
    presentation;
    constructor(serviceName) {
        this.loader = new Loader_1.default();
        this.express = (0, express_1.default)();
        this.service = this.loader.load(serviceName);
        this.config = new Config_1.default();
        const name = this.service.serviceName();
        const conf = this.config.loadConfig(name);
        this.service.applyConfigData(conf);
        this.storage = this.service.makeStorage();
        this.presentation = new Presentation_1.default(this.service);
    }
    run() {
        this.service.prepare();
        const name = this.service.serviceName();
        const port = this.service.servicePort();
        this.express.use(function (req, res, next) {
            console.log(req.socket.remoteAddress + ' ' + req.method + ' ' + req.path);
            next();
        });
        this.express.get('/', (req, res) => {
            res.send(`<h1>Everscale monitoring: ${name}</h1><a href="/metrics">Prometheus metrics</a>\n`);
        });
        this.express.get('/metrics', async (req, res) => {
            res.send(await this.process());
        });
        if ((0, Utils_1.env)('DEBUG_TOUCH', '0') !== '0') {
            this.process()
                .then(value => {
                console.log('Execution result:', '\n' + value.split('\n').slice(0, 2000).join('\n') + '\n.........', '\nResult length: ' + value.length);
                process.exit(0);
            })
                .catch(reason => { console.error('Execution failed:\n', reason); process.exit(0); });
        }
        else
            this.express.listen(port, () => {
                console.log(`Everscale monitoring service ${this.service.serviceName()} started on port ${port}`);
            });
    }
    async process() {
        try {
            const metrics = await this.service.execute();
            try {
                return this.presentation.present(metrics, (0, Utils_1.env)('DEBUG_TOUCH', '0') != '0') + '\n';
            }
            catch (e) {
                console.error('Metrics presentation failed:', e);
                return 'Internal error (Presentation)';
            }
        }
        catch (e) {
            console.error('Metrics execution failed:', e);
            return 'Internal error (Metrics)';
        }
    }
}
exports.default = Application;
