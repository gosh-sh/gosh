import AppHandler from "./AppHandler";
import {MetricsMap} from "../PrometheusFormatter";
import {nls} from "../Utils";

export default class AppWriteHandler extends AppHandler {

    describe(): string {
        return `App write handler (${this.goshDescribe()})`;
    }

    async handle(debug: boolean): Promise<MetricsMap> {
        return await this.doSteps(
            /* 0 - 12*/ ...this.initialSteps(debug),
            /*13*/ () => this.click("svg.fa-pencil"),
            /*14*/ () => this.erasePaste("div.view-lines", this.prepareFileContents()),
            /*15*/ () => this.pasteInto("//input[@name='title' and @placeholder='Commit title']", `Update ${this.filename} (${nls()})`),
            /*16*/ () => this.click("//button[contains(., 'Commit changes') and @type='submit']"),
            () => this.pageDown(true, 2),
            /*17*/ () => this.waitForGone('svg.fa-spin', 180000),
            /*18*/ () => this.waitFor("svg.fa-pencil"),
            /*19*/ () => this.click("svg.fa-copy"),
            /*20*/ () => { return this.processFileContents(); }
        );
    }

}