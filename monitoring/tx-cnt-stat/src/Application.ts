import express, { Express, Request, Response } from 'express';
import Service from "./Service";
import Config from "./Config";
import Storage from "./Storage";
import Presentation from "./Presentation";
import Loader from "./Loader";
import {env} from "./Utils";

export default class Application {

    express: Express;
    config: Config;
    service: Service;

    loader: Loader;
    storage: Storage;
    presentation: Presentation;

    constructor(serviceName: string) {
        this.loader = new Loader();

        this.express = express();
        this.service = this.loader.load(serviceName);
        this.config = new Config();

        const name = this.service.serviceName();
        const conf = this.config.loadConfig(name);
        this.service.applyConfigData(conf);

        this.storage = this.service.makeStorage();
        this.presentation = new Presentation(this.service);
    }

    run() {
        this.service.prepare();

        const name = this.service.serviceName();
        const port = this.service.servicePort();

        this.express.use(function (req: Request, res: Response, next) {
            console.log(req.socket.remoteAddress + ' ' + req.method + ' ' + req.path);
            next();
        });

        this.express.get('/', (req: Request, res: Response) => {
            res.send(`<h1>Monitoring: ${name}</h1><a href="/metrics">Prometheus metrics</a>\n`);
        });

        this.express.get('/metrics', async (req: Request, res: Response) => {
            res.send(await this.process());
        });

        if (env('DEBUG_TOUCH', '0') !== '0') {
            this.process()
                .then(value => { console.log('Execution result:', '\n' + value.split('\n').slice(0, 2000).join('\n') + '\n.........',
                    '\nResult length: ' + value.length); process.exit(0); })
                .catch(reason => { console.error('Execution failed:\n', reason); process.exit(0); });
        }
        else this.express.listen(port, () => {
            console.log(`Monitoring service ${this.service.serviceName()} started on port ${port}`);
        });
    }

    async process(): Promise<string> {
        try {
            const metrics = await this.service.execute();
            try {
                return this.presentation.present(metrics, env('DEBUG_TOUCH', '0') != '0') + '\n';
            } catch (e) {
                console.error('Metrics presentation failed:', e);
                return 'Internal error (Presentation)';
            }
        } catch (e) {
            console.error('Metrics execution failed:', e);
            return 'Internal error (Metrics)';
        }
    }

}