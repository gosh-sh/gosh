"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const GoshHandler_1 = __importDefault(require("./GoshHandler"));
const Utils_1 = require("../Utils");
class AppHandler extends GoshHandler_1.default {
    async removeFooter() {
        // new footer fa.copy icons interfere with many tests
        await this.page.waitForSelector('footer');
        await this.page.$eval('footer', el => el.remove());
        return null;
    }
    initialSteps(debug, label) {
        const or = this.organization, re = this.repository, br = this.branch, fn = this.filename;
        const steps = [
            'start browser', () => this.startBrowser(debug),
            'open page', () => this.openPage(this.appurl),
            AppHandler.indexSteps,
            'remove footer', () => this.removeFooter(),
            'click signin', () => this.click(`//a[${(0, Utils_1.ac_hrefs)('/a/signin')}]`),
            'input seed', () => this.pasteInto("//textarea[@name='phrase']", this.seed, undefined, undefined, true),
            'input username', () => this.pasteInto("//input[@name='username']", this.username, 50, true),
            'click sign in', () => this.click("//button[contains(., 'Sign in') and @type='submit']"),
            'wait 100ms', () => this.wait(100),
            'input pin code', () => this.type("//input[@type='password' and @placeholder='PIN code']", "1111"),
            'wait 200ms', () => this.wait(200),
            'confirm pin code', () => this.type("//input[@type='password' and @placeholder='PIN code']", "1111"),
            'wait for spinner gone', () => this.waitForGone('svg.fa-spinner'),
            'wait 100ms to settle', () => this.wait(100),
            AppHandler.userSteps,
            'search for organization', () => this.type('//input[@type="search"]', or),
            'click organization', () => this.click(`//a[${(0, Utils_1.or_hrefs)(`/o/${or}`)}]`),
            'wait for spinner gone', () => this.waitForGone('svg.fa-spinner'),
            'wait 100ms to settle', () => this.wait(100),
            'search for repository', () => this.type('//input[@type="search"]', re),
            'click repository', () => this.click(`//a[${(0, Utils_1.or_hrefs)(`/o/${or}/r/${re}`)}]`),
            'click branches', () => this.click(`//a[${(0, Utils_1.or_hrefs)(`/o/${or}/r/${re}/branches`)}]`),
            AppHandler.branchSteps,
            'click branch', () => this.click(`//a[${(0, Utils_1.or_hrefs)(`/o/${or}/r/${re}/tree/${br}`)}]`),
            'click file', () => this.click(`//a[${(0, Utils_1.or_hrefs)(`/o/${or}/r/${re}/blobs/view/${br}/${fn}`)}]`),
            'wait 500ms', () => this.wait(500)
        ];
        if (label === undefined)
            return steps;
        const index = steps.indexOf(label);
        if (index === -1)
            throw new Error(`Label ${label} not found!`);
        return steps.slice(0, index);
    }
}
exports.default = AppHandler;
AppHandler.indexSteps = ':indexSteps';
AppHandler.userSteps = ':userSteps';
AppHandler.branchSteps = ':branchSteps';
