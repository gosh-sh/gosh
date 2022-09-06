"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Handler_1 = __importDefault(require("../Handler"));
const Utils_1 = require("../Utils");
const fs_1 = require("fs");
const promises_1 = require("timers/promises");
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
    }
    setTimeout(timeout) {
        this.timeout = timeout;
    }
    applyExtraConfiguration(c) {
        super.applyExtraConfiguration(c);
        if (c['pupextraflags'])
            this.pupextraflags = c['pupextraflags'];
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
        this.log = [(0, Utils_1.nls)() + ' Begin'];
        this.page
            .on('console', message => this.log.push(`${(0, Utils_1.nls)()} ${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
            .on('pageerror', ({ message }) => this.log.push((0, Utils_1.nls)() + ' ' + message))
            .on('response', response => this.log.push(`${(0, Utils_1.nls)()} ${response.status()} ${response.url()}`))
            .on('requestfailed', request => this.log.push(`${(0, Utils_1.nls)()} ${request.failure().errorText} ${request.url()}`));
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
        return (await this.page.$$(elem)).length;
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
                await (await this.find(elem)).click();
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
    async pasteInto(elem, text, timeout) {
        const element = await this.find(elem, timeout);
        await element.focus();
        await this.paste(text, true, true);
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
    async dumpToFile(fname, add, final = true) {
        if (this.page && final)
            await this.page.screenshot({ path: fname + '.png' });
        if (this.log.length > 1) {
            if (final)
                this.log.push((0, Utils_1.nls)() + ' End');
            (0, fs_1.writeFileSync)(fname + '.log', this.log.join('\n') + '\n' + add + '\n', 'utf8');
        }
    }
    async doSteps(...steps) {
        this.startedms = (0, Utils_1.nowms)();
        this.started = Math.trunc(this.startedms / 1000);
        try {
            for (let f of steps) {
                // if (this.app.steps)
                this.say(`Running step #${this.stepsDone}`);
                const res = await f();
                if (res !== null)
                    this.stepsDone++;
                let isslow = false;
                let slow = this.app.interval; // in msec, short timeout for web
                if (this.timeout < 1000 && this.timeout > slow)
                    slow = this.timeout; // in seconds, for remote
                if ((0, Utils_1.now)() - this.started > slow) {
                    isslow = true;
                    await this.dumpToFile('errors/slow-' + (process.env.GM_MODE ?? 'error') + '-' + this.stepsDone, '', false);
                }
                if (res !== undefined && res !== null) {
                    if (isslow)
                        await this.dumpToFile('errors/slow-' + (process.env.GM_MODE ?? 'error') + '-' + this.stepsDone, '', true);
                    return new Map([
                        ["result", 100],
                        ["value", res],
                        ["timestamp", (0, Utils_1.now)()],
                        ["started", this.started],
                        ["duration", (0, Utils_1.now)() - this.started]
                    ]);
                }
            }
        }
        catch (e) {
            console.error(e);
            await this.dumpToFile('errors/' + (process.env.GM_MODE ?? 'error') + '-' + this.stepsDone, e.toString());
        }
        finally {
            await this.finally();
        }
        return new Map([
            ["result", this.stepsDone],
            ["timestamp", (0, Utils_1.now)()],
            ["duration", (0, Utils_1.now)() - this.started]
        ]);
    }
    async finally() {
        if (this.browser) {
            await this.page.close();
            await this.browser.close();
            await this.browser.disconnect();
        }
        this.log = [];
    }
    say(msg, loud = false) {
        this.log.push(msg);
        if (loud || this.debug || process.env.RUN_NOW)
            console.log(msg);
    }
}
exports.default = ScenarioHandler;
