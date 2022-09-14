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
    }
    setOrigin(origin) {
        this.origin = origin;
    }
    applyExtraConfiguration(c) {
        super.applyExtraConfiguration(c);
        this.setOrigin(c['origin']);
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
        let trash_count = 0;
        return await this.doSteps(
        /* 0 - 9 */ ...this.initialSteps(debug, AppHandler_1.default.branchSteps), 
        /*10*/ () => this.pasteInto("//input[@type='text' and @placeholder='Search branch...']", this.branch), 
        // /*11*/ () => this.onlyOne("svg.fa-trash"),
        // Make it possible to work if branch does not exist at all
        /*11*/ async () => {
            trash_count = await this.count("svg.fa-trash");
            if (trash_count > 1)
                await this.onlyOne("svg.fa-trash");
        }, 
        /*12*/ () => this.registerDialogHandler(), 
        /*13*/ async () => { if (trash_count == 1)
            await this.click("svg.fa-trash"); }, 
        /*14*/ () => this.waitForGone('svg.fa-spin', 180000), 
        /*15*/ () => this.click("svg.fa-code-branch"), 
        /*16*/ () => this.pasteInto("//input[@type='text' and @placeholder='Search branch']", this.origin), 
        /*17*/ () => this.click(`//li[contains(., '${this.origin}') and @role='option']`), 
        /*18*/ () => this.pasteInto("//input[@name='newName' and @placeholder='Branch name']", this.branch), 
        /*19*/ () => this.click("//button[contains(., 'Create branch') and @type='submit']"), 
        /*20*/ () => this.waitForGone('svg.fa-spin', 180000), 
        /*21*/ () => this.click(`//a[@href='/${this.organization}/${this.repository}/tree/${this.branch}']`), 
        /*22*/ () => this.click(`//a[@href='/${this.organization}/${this.repository}/blobs/${this.branch}/${this.filename}']`), 
        /*23*/ () => this.click("svg.fa-pencil"), 
        /*24*/ () => this.erasePaste("div.view-lines", this.prepareFileContents()), 
        /*25*/ () => this.pasteInto("//input[@name='title' and @placeholder='Commit title']", `Update ${this.filename} (${(0, Utils_1.nls)()})`), 
        /*26*/ () => this.click("//button[contains(., 'Commit changes') and @type='submit']"), () => this.pageDown(debug, 2), 
        // /*27*/ () => this.click("svg.fa-copy", 180000),
        // () => this.wait(5000),
        // /*28*/ async () => { try { return await this.processFileContents(); } catch (e) { console.error(e); return 0; } }
        /*27*/ () => this.waitFor("svg.fa-copy", 180000), () => this.wait(1000), 
        /*28*/ () => this.closePage(), 
        /*29 - 40*/ ...this.initialSteps(debug), 
        /*41*/ () => this.click("svg.fa-copy"), 
        /*42*/ async () => { const ret = await this.processFileContents(); if (ret == 0)
            throw new Error('Commit not applied'); return ret; });
    }
}
exports.default = AppRotateHandler;
