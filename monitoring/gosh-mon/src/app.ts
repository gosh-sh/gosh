import Application from "./Application";
import selectHandler from "./selectHandler";
import fs from "fs";
import * as yaml from "js-yaml";
import ScriptHandler from "./Handlers/ScriptHandler";
import {clone} from "./Utils";
import Redlock from "redlock";

let conf: any = {};
try {
    conf = yaml.load(fs.readFileSync('./config/config.yml', 'utf8'));
    const cred = yaml.load(fs.readFileSync('./config/credentials.yml', 'utf8'));
    Object.assign(conf.global, cred);
    console.log('Loaded configuration');
} catch (e) {
    console.error("Failed to load configuration", e);
    process.exit(1);
}

ScriptHandler.Config = clone(conf);

const mode = process.env['GM_MODE'] ?? process.argv[2];

// @ts-ignore original lock entry contents value generator
const redlock_orig_random = Redlock.prototype._random;

// @ts-ignore append mode to tail to see in redis ui who locked what
Redlock.prototype._random = function(): string {
    return redlock_orig_random() + '_' + mode;
}

if (!mode) {
    console.error('Specify correct application mode via parameter or E2E_MODE env');
    console.error('Available: ' + Object.keys(conf['modes']).join(', '));
    process.exit(1);
}

const c = Object.assign({}, conf['global'], conf['modes'][mode]);

for (let k in process.env) {
    if (k.startsWith('CONFIG_')) {
        c[k.slice(7).toLowerCase()] = process.env[k];
    }
}

if (c.include) {
    const incl = yaml.load(fs.readFileSync('./config/' + c.include + '.yml', 'utf8'));
    Object.assign(c, incl);
    Object.assign(conf.global, incl);
    console.log('Loaded included file ' + c.include);
}

const app: Application = new Application();
app.handlerFactory = (silent?: boolean) => selectHandler(c.handler, silent).applyConfiguration(c);
app.setInterval(c['interval'] - c['subinterval']);
app.promformatter.prefix = c['prefix'];
app.promformatter.tagpfx = `mode="${mode}"`;

console.log('Configured mode: ' + mode.replaceAll('-', ' '));

if (process.env.ONESHOT_DEBUG || process.env.RUN_NOW || c['cron']) {
    let level = Number.parseInt(process.env.ONESHOT_DEBUG ?? '0');
    app.interval = 3600;
    app.steps = true;
    if (level >= 2)
        app.setDebug(true);
    console.log("Executing immediate inquiry");
    console.log("Handler: " + app.handlerFactory(true).describe());
    app.inquiry(level >= 2, true)
        .then(res => {
            console.log("Result:\n" + res);
            process.exit(app.lastResult == 100 ? 0 : app.lastResult + 100);
        })
        .catch(err => {
            console.error(err);
            process.exit(99);
        });
} else {
    app.prepare();
    app.run();
}
