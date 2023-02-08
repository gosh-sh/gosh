"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppHandler_1 = __importDefault(require("./AppHandler"));
const Utils_1 = require("../Utils");
class SeedReadHandler extends AppHandler_1.default {
    describe() {
        return `Seed read handler`;
    }
    async handle(debug) {
        return await this.doSteps(
        /* 0 -  7 */ ...this.initialSteps(debug, AppHandler_1.default.userSteps), 'click settings', /* 8*/ () => this.click(`//a[${(0, Utils_1.ac_hrefs)('/a/settings')}]`), 'wait show button', /* 9*/ () => this.waitFor("//button[contains(., 'Show') and @type='button']"), 'click show btn 2', /*10*/ () => this.clickNow("//button[contains(., 'Show') and @type='button']", 1), 'click copy icon 2', /*11*/ () => this.clickNow("svg.fa-copy", 3), 'check seed', /*12*/ () => { return this.checkSeed(); });
    }
    async checkSeed() {
        const obtainedSeed = await this.getClipboard();
        if (obtainedSeed === this.seed)
            return 0;
        else
            throw new Error('Returned value does not match expected');
    }
}
exports.default = SeedReadHandler;
