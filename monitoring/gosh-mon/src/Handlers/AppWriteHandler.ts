import AppHandler from "./AppHandler";
import {MetricsMap} from "../PrometheusFormatter";
import {nls} from "../Utils";

export default class AppWriteHandler extends AppHandler {

    describe(): string {
        return `App write handler (${this.goshDescribe()})`;
    }

    async handle(debug: boolean): Promise<MetricsMap> {
        return await this.doSteps(
            /* 0 - 11*/ ...this.initialSteps(debug),
            /*12*/ () => this.click("svg.fa-pencil"),
            /*13*/ () => this.erasePaste("div.view-lines", this.prepareFileContents()),
            /*14*/ () => this.pasteInto("//input[@name='title' and @placeholder='Commit title']", `Update ${this.filename} (${nls()})`),
            /*15*/ () => this.click("//button[contains(., 'Commit changes') and @type='submit']"),
            () => this.pageDown(debug, 2),
            /*16*/ () => this.click("svg.fa-copy", 180000),
            /*17*/ () => { return this.processFileContents(); }
        );
    }

}