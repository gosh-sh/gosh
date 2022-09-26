"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppHandler_1 = __importDefault(require("./AppHandler"));
const yaml = __importStar(require("js-yaml"));
const fs_1 = __importDefault(require("fs"));
const selectHandler_1 = __importDefault(require("../selectHandler"));
const Utils_1 = require("../Utils");
class ScriptHandler extends AppHandler_1.default {
    constructor() {
        super(...arguments);
        this.scriptname = '';
        this.script = [];
        this.jsonscript = '';
        this.config = {};
    }
    // config precedence for executed handlers in script:
    // global -> credentials -> mode config -> CONFIG_* envs -> _: config overrides -> script overrides -> MCONF_MODE_NAME_* envs
    applyConfiguration(c) {
        super.applyConfiguration(c);
        this.useFields(c, [], ['script', 'scriptname', 'jsonscript']);
        if (this.jsonscript !== '') {
            this.script = JSON.parse(this.jsonscript);
        }
        if (this.scriptname !== '') {
            try {
                // @ts-ignore
                this.script = yaml.load(fs_1.default.readFileSync(`./config/scripts/${this.scriptname}.yml`, 'utf8'));
                if (this.script.length === undefined && this.script[0] === undefined) {
                    console.error("Not an array");
                    process.exit(1);
                }
            }
            catch (e) {
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
    describe() {
        return `Multi-execution handler`;
    }
    async handle(debug) {
        this.startedms = (0, Utils_1.nowms)();
        this.started = Math.trunc(this.startedms / 1000);
        const gc = ScriptHandler.Config.global;
        const mc = ScriptHandler.Config.modes;
        const all = new Map();
        let steps = 1;
        const locovr = {};
        for (let el of this.script) {
            if (typeof el === 'string')
                el = { _: el };
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
                if (k === '_')
                    continue;
                conf[k] = el[k];
            }
            for (let k in process.env) {
                if (k.startsWith(pref)) {
                    conf[k.slice(pref.length).toLowerCase()] = process.env[k];
                }
            }
            const sub = (0, selectHandler_1.default)(conf.handler).setApplication(this.app).setDebug(debug).setSub(mode);
            sub.applyConfiguration(conf);
            console.log(`> Start step ${mode} handler ${conf.handler} <`);
            const res = await sub.handle(debug);
            console.log(`> Done step ${mode} handler ${conf.handler} <`);
            for (let k of res.keys()) {
                all.set(k + `{sub="${mode}"}"`, res.get(k));
            }
            if (!res.has('result') || !res.has('value') || res.get('result') !== 100) {
                all.set("result", steps);
                all.set("timestamp", (0, Utils_1.now)());
                all.set("started", this.started);
                all.set("duration", (0, Utils_1.now)() - this.started);
                return all;
            }
            steps++;
        }
        all.set("result", 100);
        all.set("value", 0);
        all.set("timestamp", (0, Utils_1.now)());
        all.set("started", this.started);
        all.set("duration", (0, Utils_1.now)() - this.started);
        return all;
    }
}
exports.default = ScriptHandler;
ScriptHandler.Config = {};
