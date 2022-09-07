"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Utils_1 = require("./Utils");
class Handler {
    constructor() {
        this.debug = false;
    }
    setApplication(app) {
        this.app = app;
    }
    setDebug(debug) {
        this.debug = debug;
    }
    applyExtraConfiguration(c) { }
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
