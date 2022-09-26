import express, { Express, Request, Response } from 'express';
import Handler from "./Handler";
import DummyHandler from "./Handlers/DummyHandler";
import PrometheusFormatter, {MetricsMap} from "./PrometheusFormatter";

export default class Application {

    app: Express;
    handlerFactory: ((silent?: boolean) => Handler);
    promformatter: PrometheusFormatter;

    interval: number = 50;
    lastFetched: number = 0;
    lastMetrics?: MetricsMap;

    lastResult: number = -1;

    debug: boolean = false;
    steps: boolean = false;

    setInterval(interval: number) {
        this.interval = interval;
    }

    setDebug(debug: boolean) {
        this.debug = debug;
    }

    constructor() {
        this.app = express();
        this.handlerFactory = (silent?: boolean) => new DummyHandler();
        this.promformatter = new PrometheusFormatter();
    }

    async inquiry(debug: boolean): Promise<string> {
        const handler = this.handlerFactory().setApplication(this).setDebug(this.debug || debug);
        const result = debug ? await handler.handle(true) : await handler.cachingHandle();
        if (result.has('result'))
            this.lastResult = result.get('result')!;
        return this.promformatter.process(result, debug);
    }

    prepare() {
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

    run(port: number = 9600) {
        this.app.listen(port, () => {
            console.log('GOSH monitoring service started on port ' + port);
            console.log('Handler: ' + this.handlerFactory().describe() + ', Prefix: ' + this.promformatter.prefix);
        });
    }

}
