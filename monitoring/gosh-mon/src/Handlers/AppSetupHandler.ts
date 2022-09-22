import AppHandler from "./AppHandler";
import {MetricsMap} from "../PrometheusFormatter";

export default class AppSetupHandler extends AppHandler {

    protected branches: string[] = [];

    applyExtraConfiguration(c: any) {
        super.applyExtraConfiguration(c);
        this.branches = c.branches;
    }

    describe(): string {
        return `App setup handler`;
    }

    async handle(debug: boolean): Promise<MetricsMap> {
        const found: any = {};
        const ort = `/${this.organization}/${this.repository}`;
        const bfn = `${this.branch}/${this.filename}`;
        return await this.doSteps(
            /* 0 -  7 */ ...this.initialSteps(debug, AppHandler.userSteps),
            /* 8*/ () => this.waitForGone('svg.fa-spin'),
            /* 9*/ async () => { found.org = (await this.count(`//a[@href='/${this.organization}']`)) == 1; },
            ...this.cond_ifnot(() => found.org, [
                /*10*/ () => this.click(`//a[@href='/account/orgs/create']`),
                /*11*/ () => this.type("//input[@name='name']", this.organization),
                /*12*/ () => this.click("//button[contains(., 'Create organization') and @type='submit']"),
            ]),
            /*13*/ () => this.click(`//a[@href='/${this.organization}']`, 180000),
            /*14*/ () => this.waitForGone('svg.fa-spin'),
            /*15*/ async () => { found.rep = (await this.count(`//a[@href='${ort}']`)) == 1; },
            ...this.cond_ifelse(() => found.rep, [
                /*16*/ () => this.click(`//a[@href='${ort}']`),
            ], [
                /*16*/ () => this.click(`//a[@href='/${this.organization}/repos/create']`),
                /*17*/ () => this.type("//input[@name='name']", this.repository),
                /*18*/ () => this.click("//button[contains(., 'Create repository') and @type='submit']"),
            ]),
            /*19*/ () => this.click(`//a[@href='${ort}/branches']`, 180000),
            /*20*/ () => this.waitFor(`//a[@href='${ort}/tree/main']`),
            /*21*/ async () => { found.root = (await this.count(`//a[@href='${ort}/tree/${this.branch}']`)) == 1; },
            ...this.cond_ifnot(() => found.root, [
                /*22*/ () => this.type("//input[@name='newName' and @placeholder='Branch name']", this.branch),
                /*23*/ () => this.click("//button[contains(., 'Create branch') and @type='submit']"),
                /*24*/ () => this.waitForGone('svg.fa-spin', 180000)
            ]),
            /*25*/ () => this.click(`//a[@href='${ort}/tree/${this.branch}']`),
            /*26*/ () => this.waitForGone('svg.fa-spin'),
            /*27*/ async () => { found.file = (await this.count(`//a[@href='${ort}/blobs/${bfn}' or @href='${ort}/blobs/view/${bfn}']`)) == 1; },
            ...this.cond_ifnot(() => found.file, [
                /*28*/ () => this.click(`//a[@href='${ort}/blobs/create/${this.branch}']`),
                /*29*/ () => this.erasePaste("div.view-lines", '0'),
                /*30*/ () => this.type("//input[@name='name' and @placeholder='Name of new file']", this.filename),
                /*31*/ () => this.click("//button[contains(., 'Commit changes') and @type='submit']"),
                () => this.pageDown(true, 2),
                /*32*/ () => this.waitForGone('svg.fa-spin', 180000)
            ]),
            /*33*/ () => this.click(`//a[@href='${ort}/branches']`, 180000),
            /*34*/ () => this.waitFor(`//a[@href='${ort}/tree/main']`),
            ...this.for_each(this.branches, (s) => [
                async () => { found[`b${s}`] = (await this.count(`//a[@href='${ort}/tree/${s}']`)) == 1; },
                ...this.cond_ifnot(() => found[`b${s}`], [
                    () => this.click("svg.fa-code-branch"),
                    () => this.erasePaste("//input[@type='text' and @placeholder='Search branch']", this.branch),
                    () => this.click(`//li[contains(., '${this.branch}') and @role='option']`),
                    () => this.erasePaste("//input[@name='newName' and @placeholder='Branch name']", s),
                    () => this.click("//button[contains(., 'Create branch') and @type='submit']"),
                    () => this.waitForGone('svg.fa-spin', 180000)
                ]),
            ]),
            async () => { return 0; }
        );
    }

}
