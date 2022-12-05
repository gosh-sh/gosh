import Service, {FunStrBool, PerfFun} from "./Service";
import {TonClient} from "@eversdk/core";
import {Metric, MetricsMap} from "./Presentation";
import {now} from "./Utils";
import Dict = NodeJS.Dict;

export default class TranCountService extends Service {

    protected _values: (string|number)[] = [];

    serviceName(): string {
        return "tx-cnt";
    }

    protected keepLast(k: string, v: Metric, p: FunStrBool): any {
        return p("updated");
    }

    protected async processNetwork(client: TonClient, name: string, m: MetricsMap, p: PerfFun): Promise<void> {
        const d = await this.queryInformation(client, name, p);
        const t = now();
        m.set('updated', t);
        for (let [k, v] of Object.entries(d)) {
            m.set(`res{range="${k}"}`, v!);
        }
    }

    protected async queryInformation(client: TonClient, name: string, p: PerfFun): Promise<Dict<string>> {
        const query = this.makeQueries(this._values);
        const result = await p('query', client.net.query({
            query: 'query { ' + query.join(' ') + ' }'
        }));
        return this.collectData(this._values, result);
    }

    protected makeQueries(values: any[]): string[] {
        let query = [];
        const mkval = function(x: any): string {
            const s = x.toString();
            if (!s.includes('.'))
                return s + '000000000';
            // 123.23
            // 0123456
            const l = s.length;
            const p = s.indexOf('.');
            const d = l - p - 1;
            return s.replace('.', '') + '0'.repeat(9 - d);
        }
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
        return query;
    }

    protected collectData(values: any[], result: any): Dict<string> {
        const res: Dict<string> = {};
        for (let value_spec of values) {
            const vs = value_spec.toString();
            const vk = this.specReplace(vs);
            res[vs] = result['r'+vk][0];
        }
        return res;
    }

    protected specReplace(spec: string) {
        return spec.replace('-', '_').replace('^','_').replaceAll('.', '_');
    }

}
