"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppHandler_1 = __importDefault(require("./AppHandler"));
const Utils_1 = require("../Utils");
class AppRotateHandler extends AppHandler_1.default {
    constructor() {
        super(...arguments);
        this.origin = '';
        this.lock_retry_s = 60;
    }
    applyConfiguration(c) {
        super.applyConfiguration(c);
        this.useFields(c, ['origin'], ['lock_retry_s']);
        return this;
    }
    describe() {
        return `App branch rotation handler (${this.goshDescribe()} <- ${this.origin})`;
    }
    async registerDialogHandler() {
        this.page.on('dialog', async (dialog) => {
            if (!dialog.message().includes(this.branch))
                throw new Error('Invalid dialog message: ' + dialog.message());
            await dialog.accept();
        });
    }
    async handle(debug) {
        const or = this.organization, re = this.repository, br = this.branch, fn = this.filename;
        const lck = this.redis_pref + this.lock_branch;
        let trash_count = 0;
        return await this.redlock.using([lck], 5000, {
            retryCount: Math.round(this.lock_retry_s / (this.redlock_retry_delay_ms / 1000))
        }, async () => await this.doSteps(
        /* 0 - 9 */ ...this.initialSteps(debug, AppHandler_1.default.branchSteps), 'input branch name', /*10*/ () => this.type("//input[@type='text' and @placeholder='Search branch...']", this.branch), 
        // /*11*/ () => this.onlyOne("svg.fa-trash"),
        // Make it possible to work if branch does not exist at all
        'check trash icon count', /*11*/ async () => {
            trash_count = await this.count("svg.fa-trash");
            if (trash_count > 1)
                await this.onlyOne("svg.fa-trash");
        }, 'register dialog handler', /*12*/ () => this.registerDialogHandler(), 'click trash icon', /*13*/ async () => {
            if (trash_count == 1)
                await this.click("svg.fa-trash");
        }, 'wait for spinner gone', /*14*/ () => this.waitForGone('svg.fa-spin', this.longtimeout_ms), 'click code branch icon', /*15*/ () => this.click("svg.fa-code-branch"), 'input src branch name', /*16*/ () => this.type("//input[@type='text' and @placeholder='Search branch']", this.origin), 'click branch item', /*17*/ () => this.click(`//li[contains(., '${this.origin}') and @role='option']`), 'wait 500ms', () => this.wait(500), 'input dst branch name', /*18*/ () => this.type("//input[@name='newName' and @placeholder='Branch name']", this.branch), 'click create br button', /*19*/ () => this.click("//button[contains(., 'Create branch') and @type='submit']"), 
        // 'wait for spinner gone',   /*20*/ () => this.waitForGone('svg.fa-spin', this.longtimeout_ms),
        'nop', /*20*/ async () => {
        }, 'click dst branch', /*21*/ () => this.click(`//a[${(0, Utils_1.or_hrefs)(`/o/${or}/r/${re}/tree/${br}`)}]`, this.longtimeout_ms), 'click file', /*22*/ () => this.click(`//a[${(0, Utils_1.or_hrefs)(`/o/${or}/r/${re}/blobs/view/${br}/${fn}`)}]`), 'click edit icon', /*23*/ () => this.click("svg.fa-pencil"), 'input file contents', /*24*/ () => this.erasePaste("div.view-lines", this.prepareFileContents()), 'input commit title', /*25*/ () => this.type("//input[@name='title' and @placeholder='Commit title']", `Update ${fn} (${(0, Utils_1.niso)()})`), 'click commit button', /*26*/ () => this.click("//button[contains(., 'Commit changes') and @type='submit']"), 'scroll down', () => this.pageDown(debug, 2), 
        // /*27*/ () => this.click("svg.fa-copy", this.longtimeout_ms),
        // () => this.wait(5000),
        // /*28*/ async () => { try { return await this.processFileContents(); } catch (e) { console.error(e); return 0; } }
        /*27*/ () => this.waitFor("svg.fa-copy", this.longtimeout_ms), 'wait 1000ms', () => this.wait(1000), 'close page', /*28*/ () => this.closePage(), 'wait 10000ms', () => this.wait(10000), 
        /*29 - 40*/ ...this.initialSteps(debug), 'click copy icon', /*41*/ () => this.click("svg.fa-copy"), 'check file contents', /*42*/ async () => {
            const ret = await this.processFileContents();
            if (ret == 0)
                throw new Error('Commit not applied');
            return ret;
        }));
    }
}
exports.default = AppRotateHandler;
