import Handler from "../Handler";
import {
    Browser,
    BrowserConnectOptions,
    BrowserLaunchArgumentOptions,
    CDPSession,
    ElementHandle,
    LaunchOptions,
    Page,
    PuppeteerLifeCycleEvent
} from "puppeteer";
import {MetricsMap} from "../PrometheusFormatter";
import {ifdef, iftrue, limstr, niso, now, nowms} from "../Utils";
import fs, {writeFileSync} from "fs";
import {setTimeout} from 'timers/promises';
import glob from "glob-promise";
import path from "path";
import {performance} from "perf_hooks";
import Dict = NodeJS.Dict;

const puppeteer = require('puppeteer');

export type StepResult   = number | null | void;
export type StepFunction = ((name: string) => Promise<StepResult>);
export type StepEntry    = StepFunction | string;

export default abstract class ScenarioHandler extends Handler {

    private readonly textlim = 50;

    protected browser!: Browser;
    // protected context!: BrowserContext;
    protected session!: CDPSession;
    protected page!: Page;

    protected started: number = 0;
    protected startedms: number = 0;
    protected stepsDone: number = 0;

    protected timeout_ms: number = 10000;
    protected longtimeout_ms: number = 60000;

    protected log: string[] = [];
    protected plog?: string[];

    protected pupextraflags: string[] = [];

    protected log_ws_req: number = 0;
    protected log_ws_res: number = 0;

    protected log_counter: Dict<string> = {};

    protected _lc_entries: [string, string?][] = [];
    protected log_counts: Dict<number> = {};

    protected logger_file: number = 0;
    protected log_path_templ: string = "";

    protected do_archive_logs: boolean = true;
    protected arch_clean_old_s: number = 0;
    protected arch_clean_total_mb: number = 0;
    protected arch_clean_file_cnt: number = 0;

    applyConfiguration(c: any): ScenarioHandler {
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

    protected async startBrowser(debug: boolean): Promise<void> {
        if (this.browser)
            await this.browser.close();
        const args: LaunchOptions & BrowserLaunchArgumentOptions & BrowserConnectOptions = {
            defaultViewport: {width: 1024, height: 768},
            args: ['--no-sandbox', '--disable-setuid-sandbox'].concat(this.pupextraflags)
        };
        if (debug) {
            args.headless = false;
            args.slowMo = 1;
            args.args?.push('--start-maximized');
        }
        this.browser = await puppeteer.launch(args);
        // this.context = this.browser.defaultBrowserContext();
        // @ts-ignore Safety measure
        this.page = null;
        this.stepsDone = 0;
        this.log = [];
        this.session = await this.browser.target().createCDPSession();
        // Enable clipboard read and write
        // @ts-ignore
        await this.session.send('Browser.grantPermissions', {
            permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
        });
    }

    protected async openPage(url: string, waitUntil: PuppeteerLifeCycleEvent = 'networkidle2'): Promise<void> {
        this.page = await this.browser.newPage();
        await this.page.goto(url, {waitUntil: waitUntil});
        this.page.setDefaultTimeout(this.timeout_ms);
        this.log = [niso() + ' Begin'];
        this.page
            .on('console', message =>
                this.say(`> ${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
            .on('pageerror', ({ message }) => this.say(`Page error: ${message})`))
            .on('response', response =>
                this.say(`Response: ${response.status()} for ${response.url()} (${response.headers()['content-length']} b)`))
            .on('requestfailed', request =>
                this.say(`Request failed: ${request.failure().errorText} for ${request.method()} ${request.url()}`))
            .on('request', request =>
                this.say(`Request: ${request.method()} ${request.url()}`));
        await this.registerWebSocketHook();
    }

    protected async registerWebSocketHook() {
        for (let t of this.browser.targets()) {
            if (t.type() == "other" && t.url().startsWith('blob:https://')) {
                const client = await t.createCDPSession();

                await client.send('Network.enable');

                client.on('Network.webSocketCreated', (param) => {
                    this.say(`Web socket created: ${param.url}`);
                });

                const log_con = Number.parseInt(process.env.ONESHOT_DEBUG ?? '0') >= 4;

                const wsprocess = (param: any, type: string, lim: number) => {
                    try {
                        const d = JSON.parse(param.response.payloadData);
                        let pl = d.payload ? ': ' + JSON.stringify(d.payload) : '';
                        if (pl.length > lim+3) pl = pl.substring(0, lim) + '...';
                        this.say(`          WS ${d.type} ${type} ${d.id??''}${pl}`, false, !log_con);
                    }
                    catch (e) {}
                };

                if (this.log_ws_req > 0)
                    client.on('Network.webSocketFrameSent', (param) => wsprocess(param, 'request', this.log_ws_req));

                if (this.log_ws_res > 0)
                    client.on('Network.webSocketFrameReceived', (param) => wsprocess(param, 'response', this.log_ws_res));
            }
        }

        return null;
    }

    protected async closePage(): Promise<void> {
        await this.page.close();
    }

    protected async getClipboard(): Promise<string> {
        // @ts-ignore navigator is internal to page function
        return await this.page.evaluate(() => navigator.clipboard.readText());
    }

    protected async setClipboard(text: string): Promise<void> {
        // @ts-ignore navigator is internal to page function
        await this.page.evaluate((text) => navigator.clipboard.writeText(text), text);
    }

    protected async paste(text: string, ctrlv: boolean = true, clear: boolean = true): Promise<void> {
        await this.setClipboard(text);
        if (ctrlv) {
            await this.page.keyboard.down('ControlLeft');
            await this.page.keyboard.press('KeyV');
            await this.page.keyboard.up('ControlLeft');
            if (clear) {
                await this.setClipboard('');
            }
        }
    }

    protected async erase(): Promise<void> {
        await this.page.keyboard.down('ControlLeft');
        await this.page.keyboard.press('KeyA');
        await this.page.keyboard.up('ControlLeft');
        await this.page.keyboard.press('Backspace');
    }

    protected async find(elem: string, timeout?: number): Promise<ElementHandle | null> {
        // this.say(`    find ${elem}${ifdef(' with timeout ', timeout)}`);
        const timeoutArg = timeout ? {timeout: timeout} : {};
        // @ts-ignore
        return elem.startsWith('/') ?
            await this.page.waitForXPath(elem, timeoutArg) :
            await this.page.waitForSelector(elem, timeoutArg);
    }

    protected async findMultipleNow(elem: string): Promise<ElementHandle[]> {
        // this.say(`    find ${elem} immediately`);
        // @ts-ignore
        return elem.startsWith('/') ?
            await this.page.$x(elem) :
            await this.page.$$(elem);
    }

    protected async onlyOne(elem: string) {
        this.say(`--- make sure ${elem} is only one`);
        const elems = await this.page.$$(elem);
        if (elems.length != 1)
            throw new Error('Found ' + elems.length + ' ' + elem + ' elements');
    }

    protected async count(elem: string) {
        this.say(`--- count amount of ${elem}`);
        return (await this.findMultipleNow(elem)).length;
    }

    protected async waitForGone(elem: string, timeout?: number) {
        this.say(`--- wait for ${elem} gone${ifdef(' with timeout ', timeout)}`);
        const timeoutArg = timeout ? {timeout: timeout} : {};
        await this.page.waitForFunction((elem: string) => !document.querySelector(elem), timeoutArg, elem);
    }

    protected async waitFor(elem: string, timeout?: number): Promise<void> {
        this.say(`--- wait for ${elem} to appear${ifdef(' with timeout ', timeout)}`);
        await (await this.find(elem, timeout));
    }

    protected async click(elem: string, timeout?: number): Promise<void> {
        this.say(`--- click ${elem}${ifdef(' with timeout ', timeout)}`);
        try {
            await (await this.find(elem, timeout))!.click();
        }
        catch (e: any) {
            if (e.toString().includes('Node is detached from document'))
                await (await this.find(elem, timeout))!.click();
            else
                throw e;
        }
    }

    protected async clickNow(elem: string, index: number = 0): Promise<void> {
        this.say(`--- click ${elem} (index ${index}) immediately`);
        await (await this.findMultipleNow(elem))[index].click();
    }

    protected async focus(elem: string, timeout?: number): Promise<void> {
        this.say(`--- focus on ${elem}${ifdef(' with timeout ', timeout)}`);
        await (await this.find(elem, timeout))!.focus();
    }

    protected async type(elem: string, text: string, timeout?: number, delay: number = 10): Promise<void> {
        this.say(`--- type ${limstr(text, this.textlim)} into ${elem}${ifdef(' with timeout ', timeout)}`);
        const element = await this.find(elem, timeout);
        await element!.focus();
        await this.page.keyboard.type(text, {delay: delay});
    }

    protected async pasteInto(elem: string, text: string, timeout?: number, optional?: boolean, secure?: boolean): Promise<void> {
        const saystr = secure === true ? '<SECRET>' : limstr(text, this.textlim);
        this.say(`--- paste ${saystr} into ${elem}${ifdef(' with timeout ', timeout)}${iftrue(' optionally', optional)}`);
        try {
            const element = await this.find(elem, timeout);
            await element!.focus();
            await this.paste(text, true, true);
        } catch (e) {
            if (optional !== true)
                throw e;
        }
    }

    protected async erasePaste(elem: string, text: string, timeout?: number, secure?: boolean): Promise<void> {
        const saystr = secure === true ? '<SECRET>' : limstr(text, this.textlim);
        this.say(`--- paste ${saystr} into ${elem} with erase${ifdef(' and timeout ', timeout)}`);
        const element = await this.find(elem, timeout);
        await element!.click();
        // await element!.focus();
        await this.erase();
        await this.wait(100);
        await this.paste(text, true, true);
    }

    protected async pageDown(doIt: boolean, times: number): Promise<null> {
        if (doIt) {
            this.say(`--- scroll page down ${times} times`);
            for (let i=0; i<times; i++)
                await this.page.keyboard.press("PageDown");
        }
        return null; // Do not count this as step
    }

    protected async read(elem: string, timeout?: number) {
        this.say(`--- read contents of ${elem}${ifdef(' with timeout ', timeout)}`);
        const element = await this.find(elem, timeout);
        return element!.evaluate(el => el.textContent);
    }

    protected async wait(milliseconds: number): Promise<null> {
        await this.page.waitForTimeout(milliseconds);
        return null; // Do not count waiting as step
    }

    protected async nodeWait(milliseconds: number): Promise<null> {
        await setTimeout(milliseconds);
        return null; // Do not count waiting as step
    }

    // mkdirs moved to Handler, now returns this and is unprotected

    protected async removeFiles(fileglob: string) {
        const files = await glob(fileglob);
        for (let f of files)
            if (fs.existsSync(f))
                fs.unlinkSync(f);
    }

    protected async moveAway(fileglob: string, dest: string) {
        const files = await glob(fileglob);
        for (let f of files)
            fs.renameSync(f, dest + path.basename(f));
    }

    protected async dumpToFile(fname: string, add: string, final: boolean = true) {
        this.maybeFlush();
        if (this.log.length > 1) {
            if (final)
                this.log.push(niso() + ' End');
            writeFileSync(fname + '.log', this.log.join('\n') + '\n' + add + '\n', 'utf8');
        }
        if (this.page && final)
            await this.page.screenshot({ path: fname + '.png', captureBeyondViewport: false });
    }

    protected archiveLog(fname: string, archpath: string, archfname: string) {
        this.mkdirs(archpath);
        this.app.cleanupLogs(archpath, this.arch_clean_old_s, this.arch_clean_file_cnt, this.arch_clean_total_mb);
        if (fs.existsSync(`${fname}.log`))
            fs.copyFileSync(`${fname}.log`, `${archpath}/${archfname}.log`);
        if (fs.existsSync(`${fname}.png`))
            fs.copyFileSync(`${fname}.png`, `${archpath}/${archfname}.png`);
    }

    protected async doSteps(...steps: StepEntry[]): Promise<MetricsMap> {
        this.say(`::: short timeout ${this.timeout_ms}, long timeout ${this.longtimeout_ms}`);
        const mode = (process.env.GM_MODE ?? 'error');
        const afterstep = this.sub !== '' ? `-${this.sub}` : '';
        let stepName = '';
        this.startedms = nowms();
        this.started = Math.trunc(this.startedms / 1000);
        const start_niso = niso();
        let perf: Map<string, number> = new Map();
        const add_auxiliary = (map: Map<string, number>): Map<string, number> => {
            for (let [k, v] of perf.entries())
                map.set(k, v);
            for (let [k, v] of Object.entries(this.log_counts))
                map.set(`log_count{item="${k}"}`, v!);
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
                const sta = performance.now();
                const res: StepResult = await f(stepName);
                const end = performance.now();
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
                if ((now() - this.started > slow) && !this.logger_file) {
                    if (!isslow) {
                        try {
                            this.mkdirs('errors/slow', `errors/slow/${mode}`, `errors/slow/${mode}/old`);
                            await this.removeFiles(`errors/slow/${mode}/old/*`);
                            await this.moveAway(`errors/slow/${mode}/*.*`, `errors/slow/${mode}/old/`);
                        } catch (e) {}
                    }
                    isslow = true;
                    try {
                        await this.dumpToFile(`errors/slow/${mode}/${step}${afterstep}`, '', false);
                    } catch (e) {}
                }
                if (res !== undefined && res !== null) {
                    this.stepsDone = 100; // for finally block (fn)
                    if (isslow)
                    try {
                        await this.dumpToFile(`errors/slow/${mode}/${step}${afterstep}`, '', true);
                    } catch (e) {}
                    return add_auxiliary(new Map<string, number>([
                        ["result",    100],
                        ["value",     res],
                        ["timestamp", now()],
                        ["started",   this.started],
                        ["duration",  now() - this.started],
                        [`details{step="100",descr="OK"}`, 100]
                    ]));
                }
                stepName = '';
            }
        } catch (e: any) {
            console.error(e);
            if (!this.logger_file)
                try {
                    const fname = `errors/${mode}/${this.stepsDone}${afterstep}`;
                    const ares = (this.stepsDone === 100) ? 'OK' : this.stepsDone.toString();
                    this.mkdirs(`errors/${mode}`, `errors/${mode}/old`);
                    await this.moveAway(`errors/${mode}/*.*`, `errors/${mode}/old/`);
                    await this.dumpToFile(fname, e.toString());
                    await this.removeFiles(`errors/${mode}/step * is *`);
                    writeFileSync(`errors/${mode}/step ${this.stepsDone}${afterstep} is ${stepName.replaceAll('>', '')}`, stepName, 'utf-8');
                    if (this.do_archive_logs)
                        this.archiveLog(fname, `errors/_archive/${mode}`, `${start_niso}-${ares}${afterstep}`);
                } catch (er: any) {
                    console.error('Failed to write error file', er);
                }
        } finally {
            await this.finally();
        }
        return add_auxiliary(new Map<string, number>([
            ["result",    this.stepsDone],
            ["timestamp", now()],
            ["started",   this.started],
            ["duration",  now() - this.started],
            [`details{step="${this.stepsDone}",descr="${stepName.replaceAll('"', '\'')}"}`, this.stepsDone]
        ]));
    }

    protected conditional(condition: () => boolean, branch_true: StepEntry[], branch_false: StepEntry[]): StepEntry[] {
        const res = [];
        res.push(async (name: string) => { this.say(`condition [${name}] result [${condition()}]`); return null; });
        for (let f of branch_true) {
            if (typeof f === 'string')
                res.push(`true -> ${f}`);
            else // @ts-ignore
                res.push(async () => { if (condition()) return await f(); });
        }
        for (let f of branch_false) {
            if (typeof f === 'string')
                res.push(`false -> ${f}`);
            else // @ts-ignore
                res.push(async () => { if (!condition()) return await f(); });
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

    protected cond_if(condition: () => boolean, branch_true: StepEntry[]): StepEntry[] {
        return this.conditional(condition, branch_true, []);
    }

    protected cond_ifnot(condition: () => boolean, branch_false: StepEntry[]): StepEntry[] {
        return this.conditional(condition, [], branch_false);
    }

    protected for_each(arr: string[], desc: string, loop_factory: (s: string) => StepEntry[]): StepEntry[] {
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

    protected async finally(): Promise<void> {
        if (this.logger_file) {
            fs.closeSync(this.logger_file);
            const res = (this.stepsDone === 100) ? 'OK' : this.stepsDone.toString();
            fs.renameSync(this.log_path_templ.replace('{}', '-busy'),
                          this.log_path_templ.replace('{}', `-res${res}`));
        }
        if (this.browser) {
            await this.page.close();
            await this.browser.close();
            await this.browser.disconnect();
        }
        this.log = [];
    }

    setParentLog(plog: string[]): ScenarioHandler {
        this.plog = plog;
        return this;
    }

    logToFile(path: string): ScenarioHandler {
        this.log_path_templ = path;
        console.log(`Logging to file ${path}`);
        if (this.logger_file)
            fs.closeSync(this.logger_file);
        this.logger_file = fs.openSync(path.replace('{}', '-busy'), 'w');
        return this;
    }

    protected maybeFlush() {
        if (this.logger_file)
            fs.fsyncSync(this.logger_file);
    }

    protected say(msg: string, loud: boolean = false, logonly: boolean = false) {
        if (this.logger_file) {
            fs.writeSync(this.logger_file, niso() + ' ' + msg + '\n', null, 'utf-8');
        } else {
            this.log.push(niso() + ' ' + msg);
            if (this.plog)
                this.plog.push(niso() + ' ' + msg);
            if (this._lc_entries.length) {
                for (let [k, v] of this._lc_entries) {
                    if (msg.includes(v!))
                        this.log_counts[k]!++;
                }
            }
        }
        if ((loud || this.debug || process.env.RUN_NOW) && !logonly)
            console.log(niso() + ' ' + msg);
    }
}