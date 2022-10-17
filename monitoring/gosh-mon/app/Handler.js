"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Utils_1 = require("./Utils");
const ioredis_1 = __importDefault(require("ioredis"));
const redlock_1 = __importDefault(require("redlock"));
class Handler {
    constructor() {
        this.debug = false;
        this.sub = '';
        this.lock_branch = '';
        this.redis_host = '';
        this.redis_pref = '';
        this.do_lock = false;
    }
    setApplication(app) {
        this.app = app;
        return this;
    }
    setDebug(debug) {
        this.debug = debug;
        return this;
    }
    setSub(s) {
        this.sub = s;
        return this;
    }
    applyConfiguration(c) {
        if (c.branch)
            this.lock_branch = c.branch;
        this.useFields(c, [], ['redis_host', 'redis_pref', 'do_lock']);
        if (this.redis_host !== '') {
            this.redis = new ioredis_1.default({ host: this.redis_host });
            this.redlock = new redlock_1.default([this.redis], { retryCount: 10, retryDelay: 100, retryJitter: 10, automaticExtensionThreshold: 1000 });
        }
        return this;
    }
    useFields(c, req, opt = []) {
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
    async cachingHandle() {
        const n = (0, Utils_1.now)();
        const lck = this.redis_pref + this.lock_branch;
        if ((n - this.app.lastFetched < this.app.interval) && (this.app.lastMetrics !== undefined)) {
            return this.app.lastMetrics;
        }
        const inner = async () => {
            this.app.lastFetched = n;
            const nextMetrics = await this.handle(false);
            if (nextMetrics && !nextMetrics.has('value') && (this.app.lastMetrics !== undefined) && this.app.lastMetrics.has('value'))
                nextMetrics.set('value', this.app.lastMetrics.get('value'));
            this.app.lastMetrics = nextMetrics;
        };
        if (this.redlock && this.lock_branch !== '' && this.lock_branch !== 'NOT_SET') {
            try {
                if (this.do_lock) // execute process with auto prolong of lock
                    await this.redlock.using([lck], 5000, { retryCount: 0 }, inner);
                else {
                    // duration = 0 breaks the logic, need to acquire some lock and immediately release
                    await (await this.redlock.acquire([lck], 5000, { retryCount: 0 })).release();
                    await inner();
                }
            }
            catch (e) {
                if (this.app.lastMetrics !== undefined)
                    return this.app.lastMetrics;
                else
                    await inner(); // no last result, need to execute regardless of lock
            }
        }
        else {
            await inner();
        }
        return this.app.lastMetrics;
    }
}
exports.default = Handler;
