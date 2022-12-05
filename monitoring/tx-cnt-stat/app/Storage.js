"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
class Storage {
    _name = '';
    _persist = false;
    metrics = {};
    hot = {};
    constructor(service) {
        this._name = service.serviceName();
        this._persist = service.metricsPersist();
    }
    store(name, metrics) {
        this.metrics[name] = metrics;
        this.hot[name] = true;
        if (this._persist)
            fs_1.default.writeFileSync(`./persist/${this._name}-${name}.json`, JSON.stringify(Array.from(metrics.entries())), 'utf-8');
    }
    get(name) {
        if (!this.metrics[name] && this._persist) {
            if (fs_1.default.existsSync(`./persist/${this._name}-${name}.json`)) {
                this.metrics[name] = new Map(JSON.parse(fs_1.default.readFileSync(`./persist/${this._name}-${name}.json`, 'utf-8')));
            }
        }
        return this.metrics[name];
    }
    is_hot(name) {
        return this.hot[name] === true;
    }
}
exports.default = Storage;
