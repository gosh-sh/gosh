import AppHandler from "./AppHandler";
import {MetricsMap} from "../Transformer";

export default class AppReadHandler extends AppHandler {

    describe(): string {
        return `App read handler (${this.goshDescribe()})`;
    }

    async handle(debug: boolean): Promise<MetricsMap> {
        return await this.doSteps(
            /* 0 - 11*/ ...this.initialSteps(debug),
            /*12*/ () => this.click("svg.fa-copy"),
            /*13*/ () => { return this.processFileContents(); }
        );
    }

}