import {MetricsMap} from "./PrometheusFormatter";
import {Metrics} from "puppeteer";
import {now} from "./Utils";
import Application from "./Application";

export default abstract class Handler {
    abstract describe(): string;
    abstract handle(debug: boolean): Promise<MetricsMap>;

    protected app!: Application;
    protected debug: boolean = false;

    protected sub = '';

    setApplication(app: Application): Handler {
        this.app = app;
        return this;
    }

    setDebug(debug: boolean): Handler {
        this.debug = debug;
        return this;
    }

    setSub(s: string): Handler {
        this.sub = s;
        return this;
    }

    applyConfiguration(c: any): Handler { return this; }

    useFields(c: any, req: string[], opt: string[] = []) {
        for (let k of req) {
            if (c[k] === undefined) {
                console.error(`Required config element ${k} not found`);
                process.exit(1);
            } // @ts-ignore
            this[k] = c[k];
        }
        for (let k of opt) {
            if (c[k] !== undefined) // @ts-ignore
                this[k] = c[k];
        }
    }

    async cachingHandle(): Promise<MetricsMap> {
        const n = now();
        if ( (n - this.app.lastFetched < this.app.interval) && (this.app.lastMetrics !== undefined)) {
            return this.app.lastMetrics;
        }
        this.app.lastFetched = n;
        const nextMetrics = await this.handle(false);
        // Persist value if it is missing
        if (!nextMetrics.has('value') && (this.app.lastMetrics !== undefined) && this.app.lastMetrics.has('value'))
            nextMetrics.set('value', this.app.lastMetrics.get('value')!);
        this.app.lastMetrics = nextMetrics;
        return this.app.lastMetrics;
    }
}
