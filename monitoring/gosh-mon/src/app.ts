import Application from "./Application";
import selectHandler from "./selectHandler";
import fs from "fs";
import * as yaml from "js-yaml";
import RemoteHandler from "./Handlers/RemoteHandler";

let conf: any = {};
try {
    conf = yaml.load(fs.readFileSync('./config/config.yml', 'utf8'));
    console.log('Loaded configuration');
} catch (e) {
    console.error("Failed to load configuration", e);
    process.exit(1);
}

const env_mode = process.env['GM_MODE'];
const arg_mode = process.argv[2];
const mode = env_mode ?? arg_mode;

const mode_config = conf['modes'][mode];
if (!mode) {
    console.error('Specify correct application mode via parameter or E2E_MODE env');
    console.error('Available: ' + Object.keys(conf['modes']).join(', '));
    process.exit(1);
}

const c = conf['global'];
for (let k in mode_config) {
    c[k] = mode_config[k];
}

for (let k in process.env) {
    if (k.startsWith('CONFIG_')) {
        c[k.slice(7).toLowerCase()] = process.env[k];
    }
}

const app: Application = new Application();
app.handlerFactory = () => {
    const handler = selectHandler(c['handler']);
    handler.setSeed(c['seed']);
    handler.setTargetParts(c['organization'], c['repository'], c['branch'], c['filename'], c['large']);
    handler.setTimeout(c['timeout']);
    handler.applyExtraConfiguration(c);
    return handler;
};
app.setInterval(c['interval'] - c['subinterval']);
app.promformatter.prefix = c['prefix'];
app.promformatter.tagpfx = `mode="${mode}"`;

console.log('Configured mode: ' + mode.replaceAll('-', ' '));

if (process.env.ONESHOT_DEBUG || process.env.RUN_NOW || c['cron']) {
    let level = Number.parseInt(process.env.ONESHOT_DEBUG ?? '0');
    app.steps = true;
    if (level >= 2)
        app.setDebug(true);
    console.log("Executing immediate inquiry");
    console.log("Handler: " + app.handlerFactory().describe());
    app.inquiry(level >= 2)
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
