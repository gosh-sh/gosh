"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Utils_1 = require("./Utils");
class Handler {
    constructor() {
        this.debug = false;
        this.sub = '';
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
    applyConfiguration(c) { return this; }
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
        if ((n - this.app.lastFetched < this.app.interval) && (this.app.lastMetrics !== undefined)) {
            return this.app.lastMetrics;
        }
        this.app.lastFetched = n;
        const nextMetrics = await this.handle(false);
        // Persist value if it is missing
        if (!nextMetrics.has('value') && (this.app.lastMetrics !== undefined) && this.app.lastMetrics.has('value'))
            nextMetrics.set('value', this.app.lastMetrics.get('value'));
        this.app.lastMetrics = nextMetrics;
        return this.app.lastMetrics;
    }
}
exports.default = Handler;
