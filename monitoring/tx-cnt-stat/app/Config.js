"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const js_yaml_1 = __importDefault(require("js-yaml"));
const fs_1 = __importDefault(require("fs"));
class Config {
    read = {};
    incl = [];
    configPath = (name) => `./config/${name}.yml`;
    loadConfig(name) {
        let conf = {};
        this.incl.push(name);
        let end = false;
        while (!end) {
            end = true;
            for (let k of this.incl) {
                if (this.read[k])
                    continue;
                conf = Object.assign({}, this.loadFile(k), conf);
                this.read[k] = true;
                if (conf['include'])
                    for (let i of conf['include']) {
                        if (!this.incl.includes(i))
                            this.incl.push(i);
                    }
            }
        }
        return conf;
    }
    loadFile(name) {
        const path = this.configPath(name);
        let conf = {};
        try {
            conf = js_yaml_1.default.load(fs_1.default.readFileSync(path, 'utf-8'));
            console.log(`Loaded configuration from ${name}`);
        }
        catch (e) {
            console.error(`Failed to load configuration ${name} from ${path}`, e);
            throw e;
        }
        return conf;
    }
}
exports.default = Config;
