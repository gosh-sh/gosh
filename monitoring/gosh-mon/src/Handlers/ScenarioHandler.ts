import Handler from "../Handler";
import {
    Browser, BrowserContext, Page,
    BrowserLaunchArgumentOptions, LaunchOptions, BrowserConnectOptions, PuppeteerLifeCycleEvent, puppeteerErrors
} from "puppeteer";
import {MetricsMap} from "../PrometheusFormatter";
import {nls, now, nowms} from "../Utils";
import {writeFileSync} from "fs";
import {setTimeout} from 'timers/promises';

const puppeteer = require('puppeteer');

export type StepResult   = number | null | void;
export type StepFunction = (() => Promise<StepResult>);

export default abstract class ScenarioHandler extends Handler {

    protected browser!: Browser;
    protected context!: BrowserContext;
    protected page!: Page;

    protected started: number = 0;
    protected startedms: number = 0;
    protected stepsDone: number = 0;

    protected timeout: number = 10000;

    protected log: string[] = [];

    protected pupextraflags: string[] = [];

    setTimeout(timeout: number) {
        this.timeout = timeout;
    }

    applyExtraConfiguration(c: any) {
        super.applyExtraConfiguration(c);
        if (c['pupextraflags'])
            this.pupextraflags = c['pupextraflags'];
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

    protected async openPage(url: string, waitUntil: PuppeteerLifeCycleEvent = 'networkidle2'): Promise<void> {
        this.page = await this.browser.newPage();
        await this.page.goto(url, {waitUntil: waitUntil});
        this.page.setDefaultTimeout(this.timeout);
        this.log = [nls() + ' Begin'];
        this.page
            .on('console', message =>
                this.log.push(`${nls()} ${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
            .on('pageerror', ({ message }) => this.log.push(nls() + ' ' + message))
            .on('response', response =>
                this.log.push(`${nls()} ${response.status()} ${response.url()}`))
            .on('requestfailed', request =>
                this.log.push(`${nls()} ${request.failure().errorText} ${request.url()}`))
    }

    protected async closePage(): Promise<void> {
        await this.page.close();
    }

    protected async copy(): Promise<string> {
        // @ts-ignore navigator is internal to page function
        return await this.page.evaluate(() => navigator.clipboard.readText());
    }

    protected async paste(text: string, ctrlv: boolean = true, clear: boolean = true): Promise<void> {
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

    protected async erase(): Promise<void> {
        await this.page.keyboard.down('ControlLeft');
        await this.page.keyboard.press('KeyA');
        await this.page.keyboard.up('ControlLeft');
        await this.page.keyboard.press('Backspace');
    }

    protected async find(elem: string, timeout?: number) {
        const timeoutArg = timeout ? {timeout: timeout} : {};
        return elem.startsWith('/') ?
            await this.page.waitForXPath(elem, timeoutArg) :
            await this.page.waitForSelector(elem, timeoutArg);
    }

    protected async findMultipleNow(elem: string) {
        return elem.startsWith('/') ?
            await this.page.$x(elem) :
            await this.page.$$(elem);
    }

    protected async onlyOne(elem: string) {
        const elems = await this.page.$$(elem);
        if (elems.length != 1)
            throw new Error('Found ' + elems.length + ' ' + elem + ' elements');
    }

    protected async count(elem: string) {
        return (await this.findMultipleNow(elem)).length;
    }

    protected async waitForGone(elem: string, timeout?: number) {
        const timeoutArg = timeout ? {timeout: timeout} : {};
        await this.page.waitForFunction((elem: string) => !document.querySelector(elem), timeoutArg, elem);
    }

    protected async waitFor(elem: string, timeout?: number): Promise<void> {
        await (await this.find(elem, timeout));
    }

    protected async click(elem: string, timeout?: number): Promise<void> {
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
        await (await this.findMultipleNow(elem))[index].click();
    }

    protected async focus(elem: string, timeout?: number): Promise<void> {
        await (await this.find(elem, timeout))!.focus();
    }

    protected async type(elem: string, text: string, timeout?: number): Promise<void> {
        const element = await this.find(elem, timeout);
        await element!.focus();
        await this.page.keyboard.type(text, {delay: 10});
    }

    protected async pasteInto(elem: string, text: string, timeout?: number, optional?: boolean): Promise<void> {
        try {
            const element = await this.find(elem, timeout);
            await element!.focus();
            await this.paste(text, true, true);
        } catch (e) {
            if (optional !== true)
                throw e;
        }
    }

    protected async erasePaste(elem: string, text: string, timeout?: number): Promise<void> {
        const element = await this.find(elem, timeout);
        await element!.click();
        // await element!.focus();
        await this.erase();
        await this.wait(100);
        await this.paste(text, true, true);
    }

    protected async pageDown(doIt: boolean, times: number): Promise<null> {
        if (doIt) {
            for (let i=0; i<times; i++)
                await this.page.keyboard.press("PageDown");
        }
        return null; // Do not count this as step
    }

    protected async read(elem: string, timeout?: number) {
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

    protected async dumpToFile(fname: string, add: string, final: boolean = true) {
        if (this.page && final)
            await this.page.screenshot({ path: fname + '.png' });
        if (this.log.length > 1) {
            if (final)
                this.log.push(nls() + ' End');
            writeFileSync(fname + '.log', this.log.join('\n') + '\n' + add + '\n', 'utf8');
        }
    }

    protected async doSteps(...steps: Array<StepFunction>): Promise<MetricsMap> {
        this.startedms = nowms();
        this.started = Math.trunc(this.startedms / 1000);
        try {
            for (let f of steps) {
                // if (this.app.steps)
                this.say(`Running step #${this.stepsDone}`);
                const res: StepResult = await f();
                if (res !== null)
                    this.stepsDone++;
                let isslow = false;
                let slow = this.app.interval; // in msec, short timeout for web
                if (this.timeout < 1000 && this.timeout > slow)
                    slow = this.timeout; // in seconds, for remote
                if (now() - this.started > slow) {
                    isslow = true;
                    await this.dumpToFile('errors/slow-' + (process.env.GM_MODE ?? 'error') + '-' + this.stepsDone, '', false);
                }
                if (res !== undefined && res !== null) {
                    if (isslow)
                        await this.dumpToFile('errors/slow-' + (process.env.GM_MODE ?? 'error') + '-' + this.stepsDone, '', true);
                    return new Map<string, number>([
                        ["result",    100],
                        ["value",     res],
                        ["timestamp", now()],
                        ["started",   this.started],
                        ["duration",  now() - this.started]
                    ]);
                }
            }
        } catch (e: any) {
            console.error(e);
            await this.dumpToFile('errors/' + (process.env.GM_MODE ?? 'error') + '-' + this.stepsDone, e.toString());
        } finally {
            await this.finally();
        }
        return new Map<string, number>([
            ["result",    this.stepsDone],
            ["timestamp", now()],
            ["duration",  now() - this.started]
        ]);
    }

    // protected conditional(condition: () => boolean, branch_true: StepFunction[], branch_false: StepFunction[]): StepFunction[] {
    //     const res = [];
    //     for (let f of branch_true) {
    //         res.push(async () => { if (condition()) return await f(); });
    //     }
    //     for (let f of branch_false) {
    //         res.push(async () => { if (!condition()) return await f(); });
    //     }
    //     return res;
    // }

    protected cond_ifelse(condition: () => boolean, branch_true: StepFunction[], branch_false: StepFunction[]): StepFunction[] {
        const res = [];
        const nop = async() => {};
        res.push(async () => { this.say(`condition result ${condition()}`); return null; });
        for (let i=0; i<Math.max(branch_true.length, branch_false.length); i++) {
            const f_true = i < branch_true.length ? branch_true[i] : nop;
            const f_false = i < branch_false.length ? branch_false[i] : nop;
            res.push(async() => { if (condition()) return f_true(); else return f_false(); })
        }
        return res;
    }

    protected cond_if(condition: () => boolean, branch_true: StepFunction[]): StepFunction[] {
        return this.cond_ifelse(condition, branch_true, []);
    }

    protected cond_ifnot(condition: () => boolean, branch_false: StepFunction[]): StepFunction[] {
        return this.cond_ifelse(condition, [], branch_false);
    }

    protected for_each(arr: string[], loop_factory: (s: string) => StepFunction[]): StepFunction[] {
        const res = [];
        for (const s of arr) {
            res.push(async () => { this.say(`for_each iterating ${s}`); return null; });
            for (const f of loop_factory(s)) {
                res.push(f);
            }
        }
        return res;
    }

    protected async finally(): Promise<void> {
        if (this.browser) {
            await this.page.close();
            await this.browser.close();
            await this.browser.disconnect();
        }
        this.log = [];
    }

    protected say(msg: string, loud: boolean = false) {
        this.log.push(msg);
        if (loud || this.debug || process.env.RUN_NOW)
            console.log(msg);
    }

}