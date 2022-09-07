"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const DummyHandler_1 = __importDefault(require("./Handlers/DummyHandler"));
const PrometheusFormatter_1 = __importDefault(require("./PrometheusFormatter"));
class Application {
    constructor() {
        this.interval = 50;
        this.lastFetched = 0;
        this.lastResult = -1;
        this.debug = false;
        this.steps = false;
        this.app = (0, express_1.default)();
        this.handlerFactory = () => new DummyHandler_1.default();
        this.promformatter = new PrometheusFormatter_1.default();
    }
    setInterval(interval) {
        this.interval = interval;
    }
    setDebug(debug) {
        this.debug = debug;
    }
    async inquiry(debug) {
        const handler = this.handlerFactory();
        handler.setApplication(this);
        handler.setDebug(this.debug || debug);
        const result = debug ? await handler.handle(true) : await handler.cachingHandle();
        if (result.has('result'))
            this.lastResult = result.get('result');
        return this.promformatter.process(result, debug);
    }
    prepare() {
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
    run(port = 9600) {
        this.app.listen(port, () => {
            console.log('GOSH monitoring service started on port ' + port);
            console.log('Handler: ' + this.handlerFactory().describe() + ', Prefix: ' + this.promformatter.prefix);
        });
    }
}
exports.default = Application;
