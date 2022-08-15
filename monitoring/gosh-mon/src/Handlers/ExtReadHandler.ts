import ExtHandler from "./ExtHandler";
import {MetricsMap} from "../Transformer";

export default class ExtReadHandler extends ExtHandler {

    describe(): string {
        return `ExtUI read handler (${this.goshDescribe()})`;
    }

    async handle(debug: boolean): Promise<MetricsMap> {
        return await this.doSteps(
            /* 0 - 11*/ ...this.initialSteps(debug),
            /*12*/ () => this.click("//button[contains(@class, 'CopyClipboard')]"),
            /*13*/ () => { return this.processFileContents(); }
        );
    }

}