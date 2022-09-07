"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppHandler_1 = __importDefault(require("./AppHandler"));
class RootCheckHandler extends AppHandler_1.default {
    constructor() {
        super(...arguments);
        this.root = '';
    }
    applyExtraConfiguration(c) {
        super.applyExtraConfiguration(c);
        this.root = c['root'];
    }
    describe() {
        return `Root check handler`;
    }
    async handle(debug) {
        return await this.doSteps(
        /* 0 -  1*/ ...this.initialSteps(debug, AppHandler_1.default.indexSteps), 
        /* 2*/ () => { return this.checkRoot(); });
    }
    async checkRoot() {
        const page_root = await this.read('footer > div > span');
        const shrt_root = this.root.slice(0, 6) + '...' + this.root.slice(-4);
        if (page_root !== shrt_root)
            throw new Error(`Root mismatch on page: got ${page_root}, expected ${shrt_root}`);
        return 0;
    }
}
exports.default = RootCheckHandler;
