"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Handler_1 = __importDefault(require("../Handler"));
const Utils_1 = require("../Utils");
const fs_1 = require("fs");
const promises_1 = require("timers/promises");
const fs_2 = __importDefault(require("fs"));
const glob_promise_1 = __importDefault(require("glob-promise"));
const path_1 = __importDefault(require("path"));
const puppeteer = require('puppeteer');
class ScenarioHandler extends Handler_1.default {
    constructor() {
        super(...arguments);
        this.started = 0;
        this.startedms = 0;
        this.stepsDone = 0;
        this.timeout = 10000;
        this.log = [];
        this.pupextraflags = [];
        this.log_ws_req = 0;
        this.log_ws_res = 0;
    }
    applyConfiguration(c) {
        super.applyConfiguration(c);
        this.useFields(c, [], ['pupextraflags', 'timeout', 'log_ws_req', 'log_ws_res']);
        return this;
    }
    async startBrowser(debug) {
        if (this.browser)
            await this.browser.close();
        const args = {
            defaultViewport: { width: 1024, height: 768 },
            args: ['--no-sandbox', '--disable-setuid-sandbox'].concat(this.pupextraflags)
        };
        if (debug) {
            args.headless = false;
            args.slowMo = 1;
            args.args?.push('--start-maximized');
        }
        this.browser = await puppeteer.launch(args);
        this.context = this.browser.defaultBrowserContext();
        // @ts-ignore Safety measure
        this.page = null;
        this.stepsDone = 0;
        this.log = [];
        // Enable clipboard read and write
        await this.context["_connection"].send('Browser.grantPermissions', {
            permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
        });
    }
    async openPage(url, waitUntil = 'networkidle2') {
        this.page = await this.browser.newPage();
        await this.page.goto(url, { waitUntil: waitUntil });
        this.page.setDefaultTimeout(this.timeout);
        this.log = [(0, Utils_1.niso)() + ' Begin'];
        this.page
            .on('console', message => this.say(`> ${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
            .on('pageerror', ({ message }) => this.say(`Page error: ${message})`))
            .on('response', response => this.say(`Response: ${response.status()} for ${response.url()}`))
            .on('requestfailed', request => this.say(`Request failed: ${request.failure().errorText} for ${request.method()} ${request.url()}`))
            .on('request', request => this.say(`Request: ${request.method()} ${request.url()}`));
        await this.registerWebSocketHook();
    }
    async registerWebSocketHook() {
        for (let t of this.browser.targets()) {
            if (t.type() == "other" && t.url().startsWith('blob:https://')) {
                const client = await t.createCDPSession();
                await client.send('Network.enable');
                client.on('Network.webSocketCreated', (param) => {
                    this.say(`Web socket created: ${param.url}`);
                });
                const log_con = Number.parseInt(process.env.ONESHOT_DEBUG ?? '0') >= 4;
                const wsprocess = (param, type, lim) => {
                    try {
                        const d = JSON.parse(param.response.payloadData);
                        let pl = d.payload ? ': ' + JSON.stringify(d.payload) : '';
                        if (pl.length > lim + 3)
                            pl = pl.substring(0, lim) + '...';
                        this.say(`          WS ${d.type} ${type} ${d.id ?? ''}${pl}`, false, !log_con);
                    }
                    catch (e) { }
                };
                if (this.log_ws_req > 0)
                    client.on('Network.webSocketFrameSent', (param) => wsprocess(param, 'request', this.log_ws_req));
                if (this.log_ws_res > 0)
                    client.on('Network.webSocketFrameReceived', (param) => wsprocess(param, 'response', this.log_ws_res));
            }
        }
        return null;
    }
    async closePage() {
        await this.page.close();
    }
    async copy() {
        // @ts-ignore navigator is internal to page function
        return await this.page.evaluate(() => navigator.clipboard.readText());
    }
    async paste(text, ctrlv = true, clear = true) {
        // @ts-ignore navigator is internal to page function
        await this.page.evaluate((text) => navigator.clipboard.writeText(text), text);
        if (ctrlv) {
            await this.page.keyboard.down('ControlLeft');
            await this.page.keyboard.press('KeyV');
            await this.page.keyboard.up('ControlLeft');
            if (clear) {
                // @ts-ignore navigator is internal to page function
                await this.page.evaluate(() => navigator.clipboard.writeText(''));
            }
        }
    }
    async erase() {
        await this.page.keyboard.down('ControlLeft');
        await this.page.keyboard.press('KeyA');
        await this.page.keyboard.up('ControlLeft');
        await this.page.keyboard.press('Backspace');
    }
    async find(elem, timeout) {
        const timeoutArg = timeout ? { timeout: timeout } : {};
        return elem.startsWith('/') ?
            await this.page.waitForXPath(elem, timeoutArg) :
            await this.page.waitForSelector(elem, timeoutArg);
    }
    async findMultipleNow(elem) {
        return elem.startsWith('/') ?
            await this.page.$x(elem) :
            await this.page.$$(elem);
    }
    async onlyOne(elem) {
        const elems = await this.page.$$(elem);
        if (elems.length != 1)
            throw new Error('Found ' + elems.length + ' ' + elem + ' elements');
    }
    async count(elem) {
        return (await this.findMultipleNow(elem)).length;
    }
    async waitForGone(elem, timeout) {
        const timeoutArg = timeout ? { timeout: timeout } : {};
        await this.page.waitForFunction((elem) => !document.querySelector(elem), timeoutArg, elem);
    }
    async waitFor(elem, timeout) {
        await (await this.find(elem, timeout));
    }
    async click(elem, timeout) {
        try {
            await (await this.find(elem, timeout)).click();
        }
        catch (e) {
            if (e.toString().includes('Node is detached from document'))
                await (await this.find(elem, timeout)).click();
            else
                throw e;
        }
    }
    async clickNow(elem, index = 0) {
        await (await this.findMultipleNow(elem))[index].click();
    }
    async focus(elem, timeout) {
        await (await this.find(elem, timeout)).focus();
    }
    async type(elem, text, timeout) {
        const element = await this.find(elem, timeout);
        await element.focus();
        await this.page.keyboard.type(text, { delay: 10 });
    }
    async pasteInto(elem, text, timeout, optional) {
        try {
            const element = await this.find(elem, timeout);
            await element.focus();
            await this.paste(text, true, true);
        }
        catch (e) {
            if (optional !== true)
                throw e;
        }
    }
    async erasePaste(elem, text, timeout) {
        const element = await this.find(elem, timeout);
        await element.click();
        // await element!.focus();
        await this.erase();
        await this.wait(100);
        await this.paste(text, true, true);
    }
    async pageDown(doIt, times) {
        if (doIt) {
            for (let i = 0; i < times; i++)
                await this.page.keyboard.press("PageDown");
        }
        return null; // Do not count this as step
    }
    async read(elem, timeout) {
        const element = await this.find(elem, timeout);
        return element.evaluate(el => el.textContent);
    }
    async wait(milliseconds) {
        await this.page.waitForTimeout(milliseconds);
        return null; // Do not count waiting as step
    }
    async nodeWait(milliseconds) {
        await (0, promises_1.setTimeout)(milliseconds);
        return null; // Do not count waiting as step
    }
    async mkdirs(...dirs) {
        for (let dir of dirs)
            if (!fs_2.default.existsSync(dir))
                await fs_2.default.mkdirSync(dir);
    }
    async removeFiles(fileglob) {
        const files = await (0, glob_promise_1.default)(fileglob);
        for (let f of files)
            if (fs_2.default.existsSync(f))
                fs_2.default.unlinkSync(f);
    }
    async moveAway(fileglob, dest) {
        const files = await (0, glob_promise_1.default)(fileglob);
        for (let f of files)
            fs_2.default.renameSync(f, dest + path_1.default.basename(f));
    }
    async dumpToFile(fname, add, final = true) {
        if (this.log.length > 1) {
            if (final)
                this.log.push((0, Utils_1.niso)() + ' End');
            (0, fs_1.writeFileSync)(fname + '.log', this.log.join('\n') + '\n' + add + '\n', 'utf8');
        }
        if (this.page && final)
            await this.page.screenshot({ path: fname + '.png' });
    }
    async doSteps(...steps) {
        const mode = (process.env.GM_MODE ?? 'error');
        let stepName = '';
        this.startedms = (0, Utils_1.nowms)();
        this.started = Math.trunc(this.startedms / 1000);
        try {
            for (let f of steps) {
                if (typeof f === 'string') {
                    stepName = f;
                    continue;
                }
                this.say(`${this.sub ? `<${this.sub}> ` : ''}********* Running step #${this.stepsDone} ${stepName ? ` (${stepName})` : ''}`);
                const res = await f(stepName);
                if (res !== null)
                    this.stepsDone++;
                if (this.stepsDone === 100)
                    this.stepsDone++;
                const step = this.stepsDone;
                let isslow = false;
                let slow = this.app.interval; // in msec, short timeout for web
                if (this.timeout < 1000 && this.timeout > slow)
                    slow = this.timeout; // in seconds, for remote
                if ((0, Utils_1.now)() - this.started > slow) {
                    if (!isslow) {
                        try {
                            await this.mkdirs('errors/slow', `errors/slow/${mode}`, `errors/slow/${mode}/old`);
                            await this.removeFiles(`errors/slow/${mode}/old/*`);
                            await this.moveAway(`errors/slow/${mode}/*.*`, `errors/slow/${mode}/old/`);
                        }
                        catch (e) { }
                    }
                    isslow = true;
                    try {
                        await this.dumpToFile(`errors/slow/${mode}/${step}`, '', false);
                    }
                    catch (e) { }
                }
                if (res !== undefined && res !== null) {
                    if (isslow)
                        try {
                            await this.dumpToFile(`errors/slow/${mode}/${step}`, '', true);
                        }
                        catch (e) { }
                    return new Map([
                        ["result", 100],
                        ["value", res],
                        ["timestamp", (0, Utils_1.now)()],
                        ["started", this.started],
                        ["duration", (0, Utils_1.now)() - this.started]
                    ]);
                }
                stepName = '';
            }
        }
        catch (e) {
            console.error(e);
            try {
                await this.mkdirs(`errors/${mode}`, `errors/${mode}/old`);
                await this.moveAway(`errors/${mode}/*.*`, `errors/${mode}/old/`);
                await this.dumpToFile(`errors/${mode}/${this.stepsDone}`, e.toString());
                await this.removeFiles(`errors/${mode}/step * is *`);
                (0, fs_1.writeFileSync)(`errors/${mode}/step ${this.stepsDone} is ${stepName.replaceAll('>', '')}`, stepName, 'utf-8');
            }
            catch (er) {
                console.error('Failed to write error file', er);
            }
        }
        finally {
            await this.finally();
        }
        return new Map([
            ["result", this.stepsDone],
            ["timestamp", (0, Utils_1.now)()],
            ["started", this.started],
            ["duration", (0, Utils_1.now)() - this.started]
        ]);
    }
    conditional(condition, branch_true, branch_false) {
        const res = [];
        res.push(async (name) => { this.say(`condition [${name}] result [${condition()}]`); return null; });
        for (let f of branch_true) {
            if (typeof f === 'string')
                res.push(`true -> ${f}`);
            else // @ts-ignore
                res.push(async () => { if (condition())
                    return await f(); });
        }
        for (let f of branch_false) {
            if (typeof f === 'string')
                res.push(`false -> ${f}`);
            else // @ts-ignore
                res.push(async () => { if (!condition())
                    return await f(); });
        }
        return res;
    }
    // Equalized branches are terrible with labelling
    // protected cond_ifelse(condition: () => boolean, branch_true: StepFunction[], branch_false: StepFunction[]): StepFunction[] {
    //     const res = [];
    //     const nop = async() => {};
    //     res.push(async () => { this.say(`condition result ${condition()}`); return null; });
    //     for (let i=0; i<Math.max(branch_true.length, branch_false.length); i++) {
    //         const f_true = i < branch_true.length ? branch_true[i] : nop;
    //         const f_false = i < branch_false.length ? branch_false[i] : nop;
    //         res.push(async() => { if (condition()) return f_true(); else return f_false(); })
    //     }
    //     return res;
    // }
    cond_if(condition, branch_true) {
        return this.conditional(condition, branch_true, []);
    }
    cond_ifnot(condition, branch_false) {
        return this.conditional(condition, [], branch_false);
    }
    for_each(arr, desc, loop_factory) {
        const res = [];
        for (const s of arr) {
            for (const f of loop_factory(s)) {
                if (typeof f === 'string')
                    res.push(`loop ${desc}: ${s} -> ${f}`);
                else
                    res.push(f);
            }
        }
        return res;
    }
    async finally() {
        if (this.browser) {
            await this.page.close();
            await this.browser.close();
            await this.browser.disconnect();
        }
        this.log = [];
    }
    say(msg, loud = false, logonly = false) {
        this.log.push((0, Utils_1.niso)() + ' ' + msg);
        if ((loud || this.debug || process.env.RUN_NOW) && !logonly)
            console.log((0, Utils_1.niso)() + ' ' + msg);
    }
}
exports.default = ScenarioHandler;
