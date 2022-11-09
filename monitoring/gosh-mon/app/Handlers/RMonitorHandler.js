"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppHandler_1 = __importDefault(require("./AppHandler"));
const redis_smq_monitor_1 = require("redis-smq-monitor");
class RMonitorHandler extends AppHandler_1.default {
    describe() {
        return `Redis SMQ Monitor Handler`;
    }
    // noinspection InfiniteLoopJS
    async handle(debug) {
        const config = this.app.rqConfig();
        const monitorServer = redis_smq_monitor_1.MonitorServer.createInstance(config);
        await monitorServer.listen();
        while (true) {
            await this.nodeWait(60000);
        }
        // return new Map([["result", 100]]);
    }
}
exports.default = RMonitorHandler;
