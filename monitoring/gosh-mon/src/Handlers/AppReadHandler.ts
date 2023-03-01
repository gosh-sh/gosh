import AppHandler from "./AppHandler";
import {MetricsMap} from "../PrometheusFormatter";

export default class AppReadHandler extends AppHandler {

    describe(): string {
        return `App read handler (${this.goshDescribe()})`;
    }

    async handle(debug: boolean): Promise<MetricsMap> {
        return await this.doSteps(
            /* 0 - 12*/ ...this.initialSteps(debug),
            'click copy icon', /*13*/ () => this.click("div.bg-gray-100 > div > button > svg.fa-copy"),
            'check contents',  /*14*/ () => { return this.processFileContents(); }
        );
    }

}