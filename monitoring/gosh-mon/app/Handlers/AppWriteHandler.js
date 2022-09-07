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
        /* 0 - 11*/ ...this.initialSteps(debug), 
        /*12*/ () => this.click("svg.fa-pencil"), 
        /*13*/ () => this.erasePaste("div.view-lines", this.prepareFileContents()), 
        /*14*/ () => this.pasteInto("//input[@name='title' and @placeholder='Commit title']", `Update ${this.filename} (${(0, Utils_1.nls)()})`), 
        /*15*/ () => this.click("//button[contains(., 'Commit changes') and @type='submit']"), () => this.pageDown(debug, 2), 
        /*16*/ () => this.click("svg.fa-copy", 180000), 
        /*17*/ () => { return this.processFileContents(); });
    }
}
exports.default = AppWriteHandler;
