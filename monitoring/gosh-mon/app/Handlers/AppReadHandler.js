"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppHandler_1 = __importDefault(require("./AppHandler"));
class AppReadHandler extends AppHandler_1.default {
    describe() {
        return `App read handler (${this.goshDescribe()})`;
    }
    async handle(debug) {
        return await this.doSteps(
        /* 0 - 12*/ ...this.initialSteps(debug), 'click copy icon', /*13*/ () => this.click("svg.fa-copy"), 'check contents', /*14*/ () => { return this.processFileContents(); });
    }
}
exports.default = AppReadHandler;
