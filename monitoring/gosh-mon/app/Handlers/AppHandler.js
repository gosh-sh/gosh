"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const GoshHandler_1 = __importDefault(require("./GoshHandler"));
class AppHandler extends GoshHandler_1.default {
    async removeFooter() {
        // new footer fa.copy icons interfere with many tests
        await this.page.waitForSelector('footer');
        await this.page.$eval('footer', el => el.remove());
        return null;
    }
    initialSteps(debug, steps) {
        return [
            'start browser', /* 0*/ () => this.startBrowser(debug),
            'open page', /* 1*/ () => this.openPage(this.appurl),
            'remove footer', () => this.removeFooter(),
            'click signin', /* 2*/ () => this.click("//a[@href='/account/signin']"),
            'input seed', /* 3*/ () => this.pasteInto("//textarea[@name='phrase']", this.seed),
            'input username', /* 4*/ () => this.pasteInto("//input[@name='username']", this.username, 50, true),
            'click sign in', /* 5*/ () => this.click("//button[contains(., 'Sign in') and @type='submit']"),
            'wait 100ms', () => this.wait(100),
            'input pin code', /* 6*/ () => this.type("//input[@type='password' and @placeholder='PIN code']", "1111"),
            'wait 200ms', () => this.wait(200),
            'confirm pin code', /* 7*/ () => this.type("//input[@type='password' and @placeholder='PIN code']", "1111"),
            'click organization', /* 8*/ () => this.click(`//a[@href='/${this.organization}']`),
            'click repository', /* 9*/ () => this.click(`//a[@href='/${this.organization}/${this.repository}']`),
            'click branches', /*10*/ () => this.click(`//a[@href='/${this.organization}/${this.repository}/branches']`),
            'click branch', /*11*/ () => this.click(`//a[@href='/${this.organization}/${this.repository}/tree/${this.branch}']`),
            'click file', /*12*/ () => this.click(`//a[@href='/${this.organization}/${this.repository}/blobs/${this.branch}/${this.filename}' or
                                                               @href='/${this.organization}/${this.repository}/blobs/view/${this.branch}/${this.filename}']`),
            'wait 500ms', () => this.wait(500)
        ].slice(0, steps);
    }
}
exports.default = AppHandler;
AppHandler.indexSteps = 4;
AppHandler.userSteps = 22;
AppHandler.branchSteps = 28;
