import {MetricsMap} from "./Transformer";
import {Metrics} from "puppeteer";
import {now} from "./Utils";
import Application from "./Application";

export default abstract class Handler {
    abstract describe(): string;
    abstract handle(debug: boolean): Promise<MetricsMap>;

    protected app!: Application;
    protected debug: boolean = false;

    setApplication(app: Application) {
        this.app = app;
    }

    setDebug(debug: boolean) {
        this.debug = debug;
    }

    applyExtraConfiguration(c: any) {}

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
