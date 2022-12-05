"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ExtHandler_1 = __importDefault(require("./ExtHandler"));
class ExtReadHandler extends ExtHandler_1.default {
    describe() {
        return `ExtUI read handler (${this.goshDescribe()})`;
    }
    async handle(debug) {
        return await this.doSteps(
        /* 0 - 11*/ ...this.initialSteps(debug), 
        /*12*/ () => this.click("//button[contains(@class, 'CopyClipboard')]"), 
        /*13*/ () => { return this.processFileContents(); });
    }
}
exports.default = ExtReadHandler;
