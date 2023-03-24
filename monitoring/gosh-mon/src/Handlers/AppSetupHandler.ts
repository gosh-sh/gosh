import AppHandler from "./AppHandler";
import {MetricsMap} from "../PrometheusFormatter";
import {ac_hrefs, or_hrefs} from "../Utils";

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
        const or = this.organization, re = this.repository, br = this.branch, fn = this.filename;
        return await this.doSteps(
            ...this.initialSteps(debug, AppHandler.userSteps),
            'search for organization',     () => this.type('//input[@type="search"]', or),
            'count wanted organizations',  async () => { found.org = (await this.count(`//a[${or_hrefs(`/o/${or}`)}]`)) == 1; },
            'organization exists', ...this.cond_ifnot(() => found.org, [
                'click org create link',   () => this.click(`//a[${ac_hrefs('/a/orgs/create')}]`),
                'input organization name', () => this.type("//input[@name='name']", this.organization),
                'click create button',     () => this.click("//button[contains(., 'Create organization') and @type='submit']"),
                'wait for search input',   () => this.waitFor('//input[@type="search"]', this.longtimeout_ms),
                'wait for spinner gone',   () => this.waitForGone('svg.fa-spinner'),
                'wait 100ms to settle',    () => this.wait(100),
                'search for organization', () => this.type('//input[@type="search"]', or),
            ]),
            'click organization link', () => this.click(`//a[${or_hrefs(`/o/${or}`)}]`),
            'wait for spinner gone',   () => this.waitForGone('svg.fa-spinner'),
            'wait 100ms to settle',    () => this.wait(100),
            'search for repository',   () => this.type('//input[@type="search"]', re),
            'count repositories',      async () => { found.rep = (await this.count(`//a[${or_hrefs(`/o/${or}/r/${re}`)}]`)) == 1; },
            'repository exists', ...this.conditional(() => found.rep, [
                'click repository link', () => this.click(`//a[${or_hrefs(`/o/${or}/r/${re}`)}]`),
            ], [
                'click repo create link', () => this.click(`//a[${or_hrefs(`/o/${or}/repos/create`)}]`),
                'input repository name',  () => this.type("//input[@name='name']", this.repository),
                'click create button',    () => this.click("//button[contains(., 'Create repository') and @type='submit']"),
            ]),
            'click branches link',    () => this.click(`//a[${or_hrefs(`/o/${or}/r/${re}/branches`)}]`, this.longtimeout_ms),
            'wait for main br link',  () => this.waitFor(`//a[${or_hrefs(`/o/${or}/r/${re}/tree/main`)}]`),
            'count wanted branches',  async () => { found.root = (await this.count(`//a[${or_hrefs(`/o/${or}/r/${re}/tree/${br}`)}]`)) == 1; },
            'branch exists', ...this.cond_ifnot(() => found.root, [
                'wait 10000ms to settle', () => this.wait(10000),
                'input branch name',      () => this.type("//input[@name='newName' and @placeholder='Branch name']", br),
                'click create button',    () => this.click("//button[contains(., 'Create branch') and @type='submit']"),
                // 'wait for spinner gone',  () => this.waitForGone('svg.fa-spin', this.longtimeout_ms)
                'wait for branch link',   () => this.waitFor(`//a[${or_hrefs(`/o/${or}/r/${re}/tree/${br}`)}]`),
            ]),
            'click branch link',     () => this.click(`//a[${or_hrefs(`/o/${or}/r/${re}/tree/${br}`)}]`),
            'wait for spinner gone', () => this.waitForGone('svg.fa-spinner'),
            'count wanted files',    async () => { found.file = (await this.count(`//a[${or_hrefs(`/o/${or}/r/${re}/blobs/view/${br}/${fn}`)}]`)) == 1; },
            'file exists', ...this.cond_ifnot(() => found.file, [
                'click add file button', () => this.click(`//a[${or_hrefs(`/o/${or}/r/${re}/blobs/create/${br}`)}]`),
                'input file contents',   () => this.erasePaste("div.view-lines", '0'),
                'input file name',       () => this.type("//input[@name='name' and @placeholder='Name of new file']", this.filename),
                'click commit button',   () => this.click("//button[contains(., 'Commit changes') and @type='submit']"),
                'scroll down',           () => this.pageDown(true, 2),
                'wait 1000ms for safety',() => this.wait(1000),
                'wait for spinner gone', () => this.waitForGone('svg.fa-spin', this.longtimeout_ms)
            ]),
            'click branches link',   () => this.click(`//a[${or_hrefs(`/o/${or}/r/${re}/branches`)}]`, this.longtimeout_ms),
            'wait for main br link', () => this.waitFor(`//a[${or_hrefs(`/o/${or}/r/${re}/tree/main`)}]`),
            ...this.for_each(this.branches, 'branches', (s) => [
                'count wanted branches', async () => { found[`b${s}`] = (await this.count(`//a[${or_hrefs(`/o/${or}/r/${re}/tree/${s}`)}]`)) == 1; },
                'branch exists', ...this.cond_ifnot(() => found[`b${s}`], [
                    'click code branch icon', () => this.click("div.items-center > svg.fa-code-branch"),
                    'input src branch name',  () => this.erasePaste("//input[@type='text' and @placeholder='Search branch']", this.branch),
                    'click branch item',      () => this.click(`//li[contains(., '${this.branch}') and @role='option']`),
                    'input dst branch name',  () => this.erasePaste("//input[@name='newName' and @placeholder='Branch name']", s),
                    'click create br button', () => this.click("//button[contains(., 'Create branch') and @type='submit']"),
                    // 'wait for spinner gone',  () => this.waitForGone('svg.fa-spin', this.longtimeout_ms)
                    'wait for branch link',   () => this.waitFor(`//a[${or_hrefs(`/o/${or}/r/${re}/tree/${s}`)}]`),
                ]),
            ]),
            'end setup', async () => { return 0; }
        );
    }

}