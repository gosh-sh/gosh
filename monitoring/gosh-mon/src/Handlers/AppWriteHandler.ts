import AppHandler from "./AppHandler";
import {MetricsMap} from "../PrometheusFormatter";
import {niso, nls} from "../Utils";

export default class AppWriteHandler extends AppHandler {

    describe(): string {
        return `App write handler (${this.goshDescribe()})`;
    }

    async handle(debug: boolean): Promise<MetricsMap> {
        return await this.doSteps(
            /* 0 - 12*/ ...this.initialSteps(debug),
            'click edit icon',     /*13*/ () => this.click("svg.fa-pencil"),
            'input file contents', /*14*/ () => this.erasePaste("div.view-lines", this.prepareFileContents()),
            'input commit title',  /*15*/ () => this.pasteInto("//input[@name='title' and @placeholder='Commit title']", `Update ${this.filename} (${niso()})`),
            'click commit button', /*16*/ () => this.click("//button[contains(., 'Commit changes') and @type='submit']"),
            'scroll down',                () => this.pageDown(true, 2),
            'wait for no spinner', /*17*/ () => this.waitForGone('svg.fa-spin', 180000),
            'wait for edit icon',  /*18*/ () => this.waitFor("svg.fa-pencil"),
            'click copy icon',     /*19*/ () => this.click("svg.fa-copy"),
            'check file contents', /*20*/ () => { return this.processFileContents(); }
        );
    }

}