"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Service_1 = __importDefault(require("./Service"));
const Utils_1 = require("./Utils");
class WalletMonService extends Service_1.default {
    _targets = {};
    serviceName() {
        return "wallet-mon";
    }
    keepLast(k, v, p) {
        return p("updated");
    }
    async processNetwork(client, name, m, p) {
        const d = await this.queryInformation(client, name, p);
        const t = (0, Utils_1.now)();
        m.set('updated', t);
        if (this._targets[name] && d && d.length) {
            const inv = Object.fromEntries(Object.entries(this._targets[name]).map(a => a.reverse()));
            for (const w of d) {
                if (!inv[w.id])
                    continue;
                const walname = inv[w.id];
                const tag = `{name="${walname}",addr="${w.id}"}`;
                m.set(`balance${tag}`, BigInt(w.balance));
                m.set(`last_paid${tag}`, w.last_paid);
                m.set(`last_trans_lt${tag}`, BigInt(w.last_trans_lt));
            }
        }
    }
    async queryInformation(client, name, p) {
        return await p('wallet_data', client.net.query_collection({
            collection: 'accounts',
            filter: { id: { in: Object.values(this._targets[name]) } },
            result: "id balance last_paid last_trans_lt"
        }));
    }
}
exports.default = WalletMonService;
