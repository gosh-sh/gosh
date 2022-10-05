import AppHandler from "./AppHandler";
import {MetricsMap} from "../PrometheusFormatter";

export default class AppSetupHandler extends AppHandler {

    protected branches: string[] = [];

    applyConfiguration(c: any): AppSetupHandler {
        super.applyConfiguration(c);
        this.useFields(c, ['branches']);
        return this;
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
            'wait for spinner gone',       /* 8*/ () => this.waitForGone('svg.fa-spin'),
            'count wanted organizations',  /* 9*/ async () => { found.org = (await this.count(`//a[@href='/${this.organization}']`)) == 1; },
            'organization exists', ...this.cond_ifnot(() => found.org, [
                'click org create link',   /*10*/ () => this.click(`//a[@href='/account/orgs/create']`),
                'input organization name', /*11*/ () => this.type("//input[@name='name']", this.organization),
                'click create button',     /*12*/ () => this.click("//button[contains(., 'Create organization') and @type='submit']"),
            ]),
            'click organization link', /*13*/ () => this.click(`//a[@href='/${this.organization}']`, 180000),
            'wait for spinner gone',   /*14*/ () => this.waitForGone('svg.fa-spin'),
            'count repositories',      /*15*/ async () => { found.rep = (await this.count(`//a[@href='${ort}']`)) == 1; },
            'repository exists', ...this.conditional(() => found.rep, [
                'click repository link', /*16*/ () => this.click(`//a[@href='${ort}']`),
            ], [
                'click repo create link', /*17*/ () => this.click(`//a[@href='/${this.organization}/repos/create']`),
                'input repository name',  /*18*/ () => this.type("//input[@name='name']", this.repository),
                'click create button',    /*19*/ () => this.click("//button[contains(., 'Create repository') and @type='submit']"),
            ]),
            'click branches link',   /*20*/ () => this.click(`//a[@href='${ort}/branches']`, 180000),
            'wait for main br link', /*21*/ () => this.waitFor(`//a[@href='${ort}/tree/main']`),
            'count wanted branches',  /*22*/ async () => { found.root = (await this.count(`//a[@href='${ort}/tree/${this.branch}']`)) == 1; },
            'branch exists', ...this.cond_ifnot(() => found.root, [
                'input branch name',     /*23*/ () => this.type("//input[@name='newName' and @placeholder='Branch name']", this.branch),
                'click create button',   /*24*/ () => this.click("//button[contains(., 'Create branch') and @type='submit']"),
                'wait for spinner gone', /*25*/ () => this.waitForGone('svg.fa-spin', 180000)
            ]),
            'click branch link',     /*26*/ () => this.click(`//a[@href='${ort}/tree/${this.branch}']`),
            'wait for spinner gone', /*27*/ () => this.waitForGone('svg.fa-spin'),
            'count wanted files',    /*28*/ async () => { found.file = (await this.count(`//a[@href='${ort}/blobs/${bfn}' or @href='${ort}/blobs/view/${bfn}']`)) == 1; },
            'file exists', ...this.cond_ifnot(() => found.file, [
                'click add file button', /*29*/ () => this.click(`//a[@href='${ort}/blobs/create/${this.branch}']`),
                'input file contents',   /*30*/ () => this.erasePaste("div.view-lines", '0'),
                'input file name',       /*31*/ () => this.type("//input[@name='name' and @placeholder='Name of new file']", this.filename),
                'click commit button',   /*32*/ () => this.click("//button[contains(., 'Commit changes') and @type='submit']"),
                'scroll down',                  () => this.pageDown(true, 2),
                'wait for spinner gone', /*33*/ () => this.waitForGone('svg.fa-spin', 180000)
            ]),
            'click branches link',   /*34*/ () => this.click(`//a[@href='${ort}/branches']`, 180000),
            'wait for main br link', /*35*/ () => this.waitFor(`//a[@href='${ort}/tree/main']`),
            ...this.for_each(this.branches, 'branches', (s) => [
                'count wanted branches', /*36 + 7i*/ async () => { found[`b${s}`] = (await this.count(`//a[@href='${ort}/tree/${s}']`)) == 1; },
                'branch exists', ...this.cond_ifnot(() => found[`b${s}`], [
                    'click code branch icon',  /*37 + 7i*/ () => this.click("svg.fa-code-branch"),
                    'input src branch name',   /*38 + 7i*/ () => this.erasePaste("//input[@type='text' and @placeholder='Search branch']", this.branch),
                    'click branch item',       /*39 + 7i*/ () => this.click(`//li[contains(., '${this.branch}') and @role='option']`),
                    'input dst branch name',   /*40 + 7i*/ () => this.erasePaste("//input[@name='newName' and @placeholder='Branch name']", s),
                    'click create br button',  /*41 + 7i*/ () => this.click("//button[contains(., 'Create branch') and @type='submit']"),
                    'wait for spinner gone',   /*42 + 7i*/ () => this.waitForGone('svg.fa-spin', 180000)
                ]),
            ]),
            'end setup', /*xx*/ async () => { return 0; }
        );
    }
    
}
