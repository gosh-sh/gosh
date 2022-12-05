import AppHandler from "./AppHandler";
import {MetricsMap} from "../PrometheusFormatter";
import * as yaml from "js-yaml";
import fs from "fs";
import selectHandler from "../selectHandler";
import {now, nowms} from "../Utils";
import ScenarioHandler from "./ScenarioHandler";

export default class ScriptHandler extends AppHandler {

    static Config: any = {};

    protected scriptname: string = '';
    protected script: any[] = [];
    protected jsonscript: string = '';

    protected config: any = {};

    // config precedence for executed handlers in script:
    // global -> credentials -> mode config -> CONFIG_* envs -> _: config overrides -> script overrides -> MCONF_MODE_NAME_* envs

    applyConfiguration(c: any): ScriptHandler {
        super.applyConfiguration(c);
        this.useFields(c, [], ['script', 'scriptname', 'jsonscript']);
        if (this.jsonscript !== '') {
            this.script = JSON.parse(this.jsonscript);
        }
        if (this.scriptname !== '') {
            try {
                // @ts-ignore
                this.script = yaml.load(fs.readFileSync(`./config/scripts/${this.scriptname}.yml`, 'utf8'));
                if (this.script.length === undefined && this.script[0] === undefined) {
                    console.error("Not an array");
                    process.exit(1);
                }
            } catch (e) {
                console.error("Failed to load script file", e);
                process.exit(1);
            }
        }
        if (!this.script.length) {
            console.warn("Empty script");
        }
        this.config = c;
        return this;
    }

    describe(): string {
        return `Multi-execution handler`;
    }

    async handle(debug: boolean): Promise<MetricsMap> {
        this.startedms = nowms();
        this.started = Math.trunc(this.startedms / 1000);
        const gc = ScriptHandler.Config.global;
        const mc = ScriptHandler.Config.modes;
        const all = new Map();
        let steps = 1;
        const locovr: any = {};
        for (let el of this.script) {
            if (typeof el === 'string')
                el = {_: el};
            const mode = el._;
            if (mode === 'config') {
                Object.assign(locovr, el);
                delete locovr['_'];
                continue;
            }
            const pref = `MCONF_${mode.replaceAll('-', '_').toUpperCase()}_`;
            if (!mc[mode]) {
                console.error(`Mode ${mode} not found!`);
                process.exit(1);
            }
            const conf = Object.assign({}, gc, mc[mode]);
            for (let k in process.env) {
                if (k.startsWith('CONFIG_')) {
                    conf[k.slice(7).toLowerCase()] = process.env[k];
                }
            }
            Object.assign(conf, locovr);
            for (let k in el) {
                if (k === '_') continue;
                conf[k] = el[k];
            }
            for (let k in process.env) {
                if (k.startsWith(pref)) {
                    conf[k.slice(pref.length).toLowerCase()] = process.env[k];
                }
            }
            const sub = selectHandler(conf.handler).setApplication(this.app).setDebug(debug).setSub(mode);
            sub.applyConfiguration(conf);
            if (sub instanceof ScenarioHandler)
                sub.setParentLog(this.log);
            console.log(`> Start step ${mode} handler ${conf.handler} <`);
            const res = await sub.handle(debug);
            console.log(`> Done step ${mode} handler ${conf.handler} <`);
            for (let k of res.keys()) {
                const kk = k.includes('}') ?
                    k.replace('}', `,sub="${mode}"}"`) :
                    k + `{sub="${mode}"}"`;
                all.set(kk, res.get(k)!);
            }
            if (!res.has('result') || !res.has('value') || res.get('result') !== 100) {
                all.set("result", steps);
                all.set("timestamp", now());
                all.set("started", this.started);
                all.set("duration", now() - this.started);
                try {
                    await this.mkdirs(`errors/${mode}`);
                    await this.dumpToFile(`errors/${mode}/script-error.log`, '', true);
                } catch(e) {}
                return all;
            }
            steps++;
        }
        all.set("result", 100);
        all.set("value", 0);
        all.set("timestamp", now());
        all.set("started", this.started);
        all.set("duration", now() - this.started);
        return all;
    }

}