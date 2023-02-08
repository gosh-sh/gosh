"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Service_1 = __importDefault(require("./Service"));
const Utils_1 = require("./Utils");
class TranCountService extends Service_1.default {
    _values = [];
    _codehash = {};
    serviceName() {
        return "tx-cnt";
    }
    keepLast(k, v, p) {
        return p("updated");
    }
    async processNetwork(client, name, m, p) {
        const d = await this.queryInformation(client, name, p);
        const t = (0, Utils_1.now)();
        m.set('updated', t);
        for (let [k, v] of Object.entries(d)) {
            if (k.startsWith('codehash-'))
                m.set(`chres{tag="${k.substring(9)}"}`, v);
            else
                m.set(`res{range="${k}"}`, v);
        }
    }
    async queryInformation(client, name, p) {
        const query = this.makeQueries(this._values, this._codehash);
        const result = await p('query', client.net.query({
            query: 'query { ' + query.join(' ') + ' }'
        }));
        return this.collectData(this._values, this._codehash, result);
    }
    makeQueries(values, codehashes) {
        let query = [];
        const mkval = function (x) {
            const s = x.toString();
            if (!s.includes('.'))
                return s + '000000000';
            // 123.23
            // 0123456
            const l = s.length;
            const p = s.indexOf('.');
            const d = l - p - 1;
            return s.replace('.', '') + '0'.repeat(9 - d);
        };
        for (let value_spec of values) {
            const vs = value_spec.toString();
            const vk = this.specReplace(vs);
            const va = vs.split('-');
            let min_value = '0', max_value = '0';
            if (va.length === 1) {
                if (vs.startsWith('^')) {
                    const v = vs.substring(1);
                    max_value = mkval(v);
                    min_value = mkval(Number.parseFloat(v) - 0.5);
                }
                else
                    min_value = max_value = mkval(vs);
            }
            else if (va.length === 2) {
                min_value = mkval(va[0]);
                max_value = mkval(va[1]);
            }
            query.push(`r${vk}:aggregateMessages(filter:{value:{ge:"${min_value}",le:"${max_value}"}}) `);
        }
        for (let [key, val] of Object.entries(codehashes)) {
            const vk = key.replaceAll('-', '_').replaceAll('.', '_');
            query.push(`c${vk}:aggregateAccounts(filter: {code_hash:{eq:"${val}"}})`);
        }
        return query;
    }
    collectData(values, codehashes, result) {
        const res = {};
        for (let value_spec of values) {
            const vs = value_spec.toString();
            const vk = this.specReplace(vs);
            res[vs] = result['r' + vk][0];
        }
        for (let [key, val] of Object.entries(codehashes)) {
            const vk = key.replaceAll('-', '_').replaceAll('.', '_');
            res['codehash-' + key] = result['c' + vk][0];
        }
        return res;
    }
    specReplace(spec) {
        return spec.replace('-', '_').replace('^', '_').replaceAll('.', '_');
    }
}
exports.default = TranCountService;
