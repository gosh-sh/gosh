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
const perf_hooks_1 = require("perf_hooks");
const puppeteer = require('puppeteer');
class ScenarioHandler extends Handler_1.default {
    constructor() {
        super(...arguments);
        this.textlim = 50;
        this.started = 0;
        this.startedms = 0;
        this.stepsDone = 0;
        this.timeout_ms = 10000;
        this.longtimeout_ms = 60000;
        this.log = [];
        this.pupextraflags = [];
        this.log_ws_req = 0;
        this.log_ws_res = 0;
        this.log_counter = {};
        this._lc_entries = [];
        this.log_counts = {};
        this.logger_file = 0;
        this.log_path_templ = "";
        this.do_archive_logs = true;
        this.arch_clean_old_s = 0;
        this.arch_clean_total_mb = 0;
        this.arch_clean_file_cnt = 0;
    }
    applyConfiguration(c) {
        super.applyConfiguration(c);
        this.useFields(c, [], ['pupextraflags', 'timeout_ms', 'log_ws_req', 'log_ws_res', 'longtimeout_ms', 'log_counter',
            'do_archive_logs', 'arch_clean_old_s', 'arch_clean_total_mb', 'arch_clean_file_cnt']);
        this.log_counts = {};
        for (let k of Object.keys(this.log_counter)) {
            this.log_counts[k] = 0;
        }
        this._lc_entries = Object.entries(this.log_counter);
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
        this.page.setDefaultTimeout(this.timeout_ms);
        this.log = [(0, Utils_1.niso)() + ' Begin'];
        this.page
            .on('console', message => this.say(`> ${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
            .on('pageerror', ({ message }) => this.say(`Page error: ${message})`))
            .on('response', response => this.say(`Response: ${response.status()} for ${response.url()} (${response.headers()['content-length']} b)`))
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
        // this.say(`    find ${elem}${ifdef(' with timeout ', timeout)}`);
        const timeoutArg = timeout ? { timeout: timeout } : {};
        return elem.startsWith('/') ?
            await this.page.waitForXPath(elem, timeoutArg) :
            await this.page.waitForSelector(elem, timeoutArg);
    }
    async findMultipleNow(elem) {
        // this.say(`    find ${elem} immediately`);
        return elem.startsWith('/') ?
            await this.page.$x(elem) :
            await this.page.$$(elem);
    }
    async onlyOne(elem) {
        this.say(`--- make sure ${elem} is only one`);
        const elems = await this.page.$$(elem);
        if (elems.length != 1)
            throw new Error('Found ' + elems.length + ' ' + elem + ' elements');
    }
    async count(elem) {
        this.say(`--- count amount of ${elem}`);
        return (await this.findMultipleNow(elem)).length;
    }
    async waitForGone(elem, timeout) {
        this.say(`--- wait for ${elem} gone${(0, Utils_1.ifdef)(' with timeout ', timeout)}`);
        const timeoutArg = timeout ? { timeout: timeout } : {};
        await this.page.waitForFunction((elem) => !document.querySelector(elem), timeoutArg, elem);
    }
    async waitFor(elem, timeout) {
        this.say(`--- wait for ${elem} to appear${(0, Utils_1.ifdef)(' with timeout ', timeout)}`);
        await (await this.find(elem, timeout));
    }
    async click(elem, timeout) {
        this.say(`--- click ${elem}${(0, Utils_1.ifdef)(' with timeout ', timeout)}`);
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
        this.say(`--- click ${elem} (index ${index}) immediately`);
        await (await this.findMultipleNow(elem))[index].click();
    }
    async focus(elem, timeout) {
        this.say(`--- focus on ${elem}${(0, Utils_1.ifdef)(' with timeout ', timeout)}`);
        await (await this.find(elem, timeout)).focus();
    }
    async type(elem, text, timeout, delay = 10) {
        this.say(`--- type ${(0, Utils_1.limstr)(text, this.textlim)} into ${elem}${(0, Utils_1.ifdef)(' with timeout ', timeout)}`);
        const element = await this.find(elem, timeout);
        await element.focus();
        await this.page.keyboard.type(text, { delay: delay });
    }
    async pasteInto(elem, text, timeout, optional, secure) {
        const saystr = secure === true ? '<SECRET>' : (0, Utils_1.limstr)(text, this.textlim);
        this.say(`--- paste ${saystr} into ${elem}${(0, Utils_1.ifdef)(' with timeout ', timeout)}${(0, Utils_1.iftrue)(' optionally', optional)}`);
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
    async erasePaste(elem, text, timeout, secure) {
        const saystr = secure === true ? '<SECRET>' : (0, Utils_1.limstr)(text, this.textlim);
        this.say(`--- paste ${saystr} into ${elem} with erase${(0, Utils_1.ifdef)(' and timeout ', timeout)}`);
        const element = await this.find(elem, timeout);
        await element.click();
        // await element!.focus();
        await this.erase();
        await this.wait(100);
        await this.paste(text, true, true);
    }
    async pageDown(doIt, times) {
        if (doIt) {
            this.say(`--- scroll page down ${times} times`);
            for (let i = 0; i < times; i++)
                await this.page.keyboard.press("PageDown");
        }
        return null; // Do not count this as step
    }
    async read(elem, timeout) {
        this.say(`--- read contents of ${elem}${(0, Utils_1.ifdef)(' with timeout ', timeout)}`);
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
    // mkdirs moved to Handler, now returns this and is unprotected
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
        this.maybeFlush();
        if (this.log.length > 1) {
            if (final)
                this.log.push((0, Utils_1.niso)() + ' End');
            (0, fs_1.writeFileSync)(fname + '.log', this.log.join('\n') + '\n' + add + '\n', 'utf8');
        }
        if (this.page && final)
            await this.page.screenshot({ path: fname + '.png' });
    }
    archiveLog(fname, archpath, archfname) {
        this.mkdirs(archpath);
        this.app.cleanupLogs(archpath, this.arch_clean_old_s, this.arch_clean_file_cnt, this.arch_clean_total_mb);
        if (fs_2.default.existsSync(`${fname}.log`))
            fs_2.default.copyFileSync(`${fname}.log`, `${archpath}/${archfname}.log`);
        if (fs_2.default.existsSync(`${fname}.png`))
            fs_2.default.copyFileSync(`${fname}.png`, `${archpath}/${archfname}.png`);
    }
    async doSteps(...steps) {
        this.say(`::: short timeout ${this.timeout_ms}, long timeout ${this.longtimeout_ms}`);
        const mode = (process.env.GM_MODE ?? 'error');
        const afterstep = this.sub !== '' ? `-${this.sub}` : '';
        let stepName = '';
        this.startedms = (0, Utils_1.nowms)();
        this.started = Math.trunc(this.startedms / 1000);
        const start_niso = (0, Utils_1.niso)();
        let perf = new Map();
        const add_auxiliary = (map) => {
            for (let [k, v] of perf.entries())
                map.set(k, v);
            for (let [k, v] of Object.entries(this.log_counts))
                map.set(`log_count{item="${k}"}`, v);
            return map;
        };
        try {
            for (let f of steps) {
                if (typeof f === 'string') {
                    stepName = f;
                    continue;
                }
                this.say(`${this.sub ? `<${this.sub}> ` : ''}********* Running step #${this.stepsDone} ${stepName ? ` (${stepName})` : ''}`);
                this.maybeFlush();
                const sta = perf_hooks_1.performance.now();
                const res = await f(stepName);
                const end = perf_hooks_1.performance.now();
                perf.set(`perf{step="${this.stepsDone}",descr="${stepName.replaceAll('"', '\'')}"}`, end - sta);
                this.say(`${this.sub ? `<${this.sub}> ` : ''}  * * * * Step #${this.stepsDone} ${stepName ? ` (${stepName})` : ''} done in ${end - sta} ms`);
                this.maybeFlush();
                if (res !== null)
                    this.stepsDone++;
                if (this.stepsDone === 100)
                    this.stepsDone++;
                const step = this.stepsDone;
                let isslow = false;
                let slow = this.app.interval; // in msec, short timeout for web
                if (this.timeout_ms < 1000 && this.timeout_ms > slow)
                    slow = this.timeout_ms; // in seconds, for remote
                if (((0, Utils_1.now)() - this.started > slow) && !this.logger_file) {
                    if (!isslow) {
                        try {
                            this.mkdirs('errors/slow', `errors/slow/${mode}`, `errors/slow/${mode}/old`);
                            await this.removeFiles(`errors/slow/${mode}/old/*`);
                            await this.moveAway(`errors/slow/${mode}/*.*`, `errors/slow/${mode}/old/`);
                        }
                        catch (e) { }
                    }
                    isslow = true;
                    try {
                        await this.dumpToFile(`errors/slow/${mode}/${step}${afterstep}`, '', false);
                    }
                    catch (e) { }
                }
                if (res !== undefined && res !== null) {
                    this.stepsDone = 100; // for finally block (fn)
                    if (isslow)
                        try {
                            await this.dumpToFile(`errors/slow/${mode}/${step}${afterstep}`, '', true);
                        }
                        catch (e) { }
                    return add_auxiliary(new Map([
                        ["result", 100],
                        ["value", res],
                        ["timestamp", (0, Utils_1.now)()],
                        ["started", this.started],
                        ["duration", (0, Utils_1.now)() - this.started],
                        [`details{step="100",descr="OK"}`, 100]
                    ]));
                }
                stepName = '';
            }
        }
        catch (e) {
            console.error(e);
            if (!this.logger_file)
                try {
                    const fname = `errors/${mode}/${this.stepsDone}${afterstep}`;
                    const ares = (this.stepsDone === 100) ? 'OK' : this.stepsDone.toString();
                    this.mkdirs(`errors/${mode}`, `errors/${mode}/old`);
                    await this.moveAway(`errors/${mode}/*.*`, `errors/${mode}/old/`);
                    await this.dumpToFile(fname, e.toString());
                    await this.removeFiles(`errors/${mode}/step * is *`);
                    (0, fs_1.writeFileSync)(`errors/${mode}/step ${this.stepsDone}${afterstep} is ${stepName.replaceAll('>', '')}`, stepName, 'utf-8');
                    if (this.do_archive_logs)
                        this.archiveLog(fname, `errors/_archive/${mode}`, `${start_niso}-${ares}${afterstep}`);
                }
                catch (er) {
                    console.error('Failed to write error file', er);
                }
        }
        finally {
            await this.finally();
        }
        return add_auxiliary(new Map([
            ["result", this.stepsDone],
            ["timestamp", (0, Utils_1.now)()],
            ["started", this.started],
            ["duration", (0, Utils_1.now)() - this.started],
            [`details{step="${this.stepsDone}",descr="${stepName.replaceAll('"', '\'')}"}`, this.stepsDone]
        ]));
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
        if (this.logger_file) {
            fs_2.default.closeSync(this.logger_file);
            const res = (this.stepsDone === 100) ? 'OK' : this.stepsDone.toString();
            fs_2.default.renameSync(this.log_path_templ.replace('{}', '-busy'), this.log_path_templ.replace('{}', `-res${res}`));
        }
        if (this.browser) {
            await this.page.close();
            await this.browser.close();
            await this.browser.disconnect();
        }
        this.log = [];
    }
    setParentLog(plog) {
        this.plog = plog;
        return this;
    }
    logToFile(path) {
        this.log_path_templ = path;
        console.log(`Logging to file ${path}`);
        if (this.logger_file)
            fs_2.default.closeSync(this.logger_file);
        this.logger_file = fs_2.default.openSync(path.replace('{}', '-busy'), 'w');
        return this;
    }
    maybeFlush() {
        if (this.logger_file)
            fs_2.default.fsyncSync(this.logger_file);
    }
    say(msg, loud = false, logonly = false) {
        if (this.logger_file) {
            fs_2.default.writeSync(this.logger_file, (0, Utils_1.niso)() + ' ' + msg + '\n', null, 'utf-8');
        }
        else {
            this.log.push((0, Utils_1.niso)() + ' ' + msg);
            if (this.plog)
                this.plog.push((0, Utils_1.niso)() + ' ' + msg);
            if (this._lc_entries.length) {
                for (let [k, v] of this._lc_entries) {
                    if (msg.includes(v))
                        this.log_counts[k]++;
                }
            }
        }
        if ((loud || this.debug || process.env.RUN_NOW) && !logonly)
            console.log((0, Utils_1.niso)() + ' ' + msg);
    }
}
exports.default = ScenarioHandler;
