"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppHandler_1 = __importDefault(require("./AppHandler"));
const Utils_1 = require("../Utils");
class AppWriteHandler extends AppHandler_1.default {
    describe() {
        return `App write handler (${this.goshDescribe()})`;
    }
    async handle(debug) {
        return await this.doSteps(
        /* 0 - 12*/ ...this.initialSteps(debug), 'click edit icon', /*13*/ () => this.click("svg.fa-pencil"), 'input file contents', /*14*/ () => this.erasePaste("div.view-lines", this.prepareFileContents()), 'input commit title', /*15*/ () => this.pasteInto("//input[@name='title' and @placeholder='Commit title']", `Update ${this.filename} (${(0, Utils_1.niso)()})`), 'click commit button', /*16*/ () => this.click("//button[contains(., 'Commit changes') and @type='submit']"), 'scroll down', () => this.pageDown(true, 2), 'wait for no spinner', /*17*/ () => this.waitForGone('svg.fa-spin', this.longtimeout_ms), 'wait for edit icon', /*18*/ () => this.waitFor("svg.fa-pencil"), 'click copy icon', /*19*/ () => this.click("svg.fa-copy"), 'check file contents', /*20*/ () => { return this.processFileContents(); });
    }
}
exports.default = AppWriteHandler;
