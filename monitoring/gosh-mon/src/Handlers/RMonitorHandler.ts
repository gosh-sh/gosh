import AppHandler from "./AppHandler";
import {MetricsMap} from "../PrometheusFormatter";
import {MonitorServer} from "redis-smq-monitor";

export default class RMonitorHandler extends AppHandler {

    describe(): string {
        return `Redis SMQ Monitor Handler`;
    }

    // noinspection InfiniteLoopJS
    async handle(debug: boolean): Promise<MetricsMap> {
        const config = this.app.rqConfig();
        const monitorServer = MonitorServer.createInstance(config);
        await monitorServer.listen();
        while (true) {
            await this.nodeWait(60000);
        }
        // return new Map([["result", 100]]);
    }

}