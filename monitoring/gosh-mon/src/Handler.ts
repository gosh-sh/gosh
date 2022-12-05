import {MetricsMap} from "./PrometheusFormatter";
import {now} from "./Utils";
import Application from "./Application";
import Client from "ioredis";
import Redlock from "redlock";
import fs from "fs";

export default abstract class Handler {
    abstract describe(): string;
    abstract handle(debug: boolean): Promise<MetricsMap>;

    protected app!: Application;
    protected debug: boolean = false;

    protected sub = '';

    protected lock_branch = '';
    protected redis_host = '';
    protected redis_pref = '';

    protected redis?: Client;
    protected redlock?: Redlock;

    protected redlock_retry_delay_ms = 100;
    protected redlock_retry_jitter_ms = 10;
    protected redlock_autoextend_ms = 1000;

    protected do_lock = false;

    protected config: any = {};

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

    applyConfiguration(c: any): Handler {
        this.config = c;
        if (c.branch)
            this.lock_branch = c.branch;
        this.useFields(c, [], ['redis_host', 'redis_pref', 'do_lock',
            'redlock_retry_delay_ms', 'redlock_retry_jitter_ms', 'redlock_autoextend_ms']);
        if (this.redis_host !== '' && this.sub === '') { // Do not use redis if running in script
            this.redis = new Client({host: this.redis_host});
            this.redlock = new Redlock([this.redis], {
                // retryCount is set manually each time redlock is used
                retryDelay: this.redlock_retry_delay_ms,
                retryJitter: this.redlock_retry_jitter_ms,
                automaticExtensionThreshold: this.redlock_autoextend_ms
            });
        }
        return this;
    }

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
        const lck = this.redis_pref + this.lock_branch;
        if ( (n - this.app.lastFetched < this.app.interval) && (this.app.lastMetrics !== undefined)) {
            return this.app.lastMetrics;
        }
        const inner = async () => {
            this.app.lastFetched = n;
            const nextMetrics = await this.handle(false);
            if (nextMetrics.get('result') !== 100) {
                try {
                    await this.app.maybeProduce(this.config);
                } catch (e) {
                    console.error('Failed producing reverb message', e);
                }
            }
            if (nextMetrics && !nextMetrics.has('value') && (this.app.lastMetrics !== undefined) && this.app.lastMetrics.has('value'))
                nextMetrics.set('value', this.app.lastMetrics.get('value')!);
            this.app.lastMetrics = nextMetrics;
        };
        if (this.redlock && this.lock_branch !== '' && this.lock_branch !== 'NOT_SET') {
            try {
                if (this.do_lock) // execute process with auto prolong of lock
                    await this.redlock.using([lck], 5000, {retryCount: 0}, inner);
                else {
                    // duration = 0 breaks the logic, need to acquire some lock and immediately release
                    await (await this.redlock.acquire([lck], 5000, {retryCount: 0})).release();
                    await inner();
                }
            } catch (e) {
                if (this.app.lastMetrics !== undefined)
                    return this.app.lastMetrics;
                else
                    await inner(); // no last result, need to execute regardless of lock
            }
        } else {
            await inner();
        }
        return this.app.lastMetrics!;
    }

    finalize() {
        try {
            if (this.redis) {
                this.redis?.quit();
            }
        } catch (e) {}
    }

    mkdirs(...dirs: string[]): Handler {
        for (let dir of dirs)
            if (!fs.existsSync(dir))
                fs.mkdirSync(dir, {recursive: true});
        return this;
    }

    logToFile(path: string): Handler { return this; }
}
