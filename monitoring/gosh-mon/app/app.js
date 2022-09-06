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
const Application_1 = __importDefault(require("./Application"));
const selectHandler_1 = __importDefault(require("./selectHandler"));
const fs_1 = __importDefault(require("fs"));
const yaml = __importStar(require("js-yaml"));
let conf = {};
try {
    conf = yaml.load(fs_1.default.readFileSync('./config/config.yml', 'utf8'));
    console.log('Loaded configuration');
}
catch (e) {
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
const app = new Application_1.default();
app.handlerFactory = () => {
    const handler = (0, selectHandler_1.default)(c['handler']);
    handler.setSeed(c['seed']);
    handler.setTargetParts(c['organization'], c['repository'], c['branch'], c['filename'], c['large']);
    handler.setTimeout(c['timeout']);
    handler.applyExtraConfiguration(c);
    return handler;
};
app.setInterval(c['interval'] - c['subinterval']);
app.transformer.prefix = c['prefix'];
app.transformer.tagpfx = `mode="${mode}"`;
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
}
else {
    app.prepare();
    app.run();
}
