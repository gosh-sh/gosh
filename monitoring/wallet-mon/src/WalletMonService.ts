import Service, {FunStrBool, NetMapStr, PerfFun} from "./Service";
import {TonClient} from "@eversdk/core";
import {Metric, MetricsMap} from "./Presentation";
import {add_tag, now} from "./Utils";

export default class WalletMonService extends Service {

    protected _targets: NetMapStr = {};

    serviceName(): string {
        return "wallet-mon";
    }

    protected keepLast(k: string, v: Metric, p: FunStrBool): any {
        return p("updated");
    }

    protected async processNetwork(client: TonClient, name: string, m: MetricsMap, p: PerfFun): Promise<void> {
        const d = await this.queryInformation(client, name, p);
        const t = now();
        m.set('updated', t);

        if (this._targets[name] && d && d.length) {
            const inv = Object.fromEntries(Object.entries(this._targets[name]!).map(a => a.reverse()));
            for (const w of d) {
                if (!inv[w.id]) continue;
                const walname = inv[w.id];
                const tag = `{name="${walname}",addr="${w.id}"}`;
                m.set(`balance${tag}`, BigInt(w.balance));
                m.set(`last_paid${tag}`, w.last_paid);
                m.set(`last_trans_lt${tag}`, BigInt(w.last_trans_lt));
                if (w.balance_other) {
                    for (const bo of w.balance_other) {
                        m.set(add_tag(`balance_other${tag}`, `currency="${bo.currency}"`), BigInt(bo.value));
                    }
                }
            }
        }

    }

    protected async queryInformation(client: TonClient, name: string, p: PerfFun): Promise<any[]> {
        return await p('wallet_data', client.net.query_collection({
            collection: 'accounts',
            filter: {id: {in: <string[]>Object.values(this._targets[name]!)}},
            result: "id balance last_paid last_trans_lt balance_other { currency value }"
        }));
    }

}
