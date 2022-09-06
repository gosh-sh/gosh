"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const GoshHandler_1 = __importDefault(require("./GoshHandler"));
class AppHandler extends GoshHandler_1.default {
    constructor() {
        super(...arguments);
        this.appurl = 'https://app.gosh.sh/';
    }
    applyExtraConfiguration(c) {
        super.applyExtraConfiguration(c);
        if (c['appurl'])
            this.appurl = c['appurl'];
    }
    initialSteps(debug, steps) {
        return [
            /* 0*/ () => this.startBrowser(debug),
            /* 1*/ () => this.openPage(this.appurl),
            /* 2*/ () => this.click("//a[@href='/account/signin']"),
            /* 3*/ () => this.pasteInto("//textarea[@name='phrase']", this.seed),
            /* 4*/ () => this.click("//button[contains(., 'Sign in') and @type='submit']"),
            () => this.wait(100),
            /* 5*/ () => this.type("//input[@type='password' and @placeholder='PIN code']", "1111"),
            () => this.wait(200),
            /* 6*/ () => this.type("//input[@type='password' and @placeholder='PIN code']", "1111"),
            /* 7*/ () => this.click(`//a[@href='/${this.organization}']`),
            /* 8*/ () => this.click(`//a[@href='/${this.organization}/${this.repository}']`),
            /* 9*/ () => this.click(`//a[@href='/${this.organization}/${this.repository}/branches']`),
            /*10*/ () => this.click(`//a[@href='/${this.organization}/${this.repository}/tree/${this.branch}']`),
            /*11*/ () => this.click(`//a[@href='/${this.organization}/${this.repository}/blobs/${this.branch}/${this.filename}']`),
            () => this.wait(500)
        ].slice(0, steps);
    }
}
exports.default = AppHandler;
AppHandler.indexSteps = 2;
AppHandler.userSteps = 9;
AppHandler.branchSteps = 12;
