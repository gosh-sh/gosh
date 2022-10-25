import Service from "./Service";

export type Metric = number | BigInt | string;
export type MetricsMap = Map<string, Metric>;

export default class Presentation {

    protected _prefix: string = '';
    protected _addtag: string = '';

    constructor(service: Service) {
        this._prefix = service.metricsPrefix();
    }

    setAdditionalTag(tag: string) {
        this._addtag = tag;
    }

    present(data_array: Array<MetricsMap>, values_only: boolean = false): string {
        let out: string[] = [];
        let seen: Set<string> = new Set<string>();
        for (let data of data_array)
            try {
                for (let [k, v] of data) {
                    try {
                        if (v === undefined || v === null) {
                            out.push(`# WARNING: ${k} has value of ${v} !!!`);
                            continue;
                        }
                        const m = this._prefix + k;
                        const sk: string = k.includes('{') ? k.substring(0, k.indexOf('{')) : m;
                        const sm: string = this._prefix + sk;
                        if (!seen.has(sm) && !values_only) {
                            out.push(`# HELP ${sm} ${this._prefix.replaceAll('_', ' ').trimEnd()} ${sk} metric`, `# TYPE ${sm} gauge`);
                            seen.add(sm);
                        }
                        let pm = m;
                        if (this._addtag != '') {
                            if (m.includes('{')) {
                                pm = m.replace('{', '{' + this._addtag + ',');
                            } else {
                                pm = m + '{' + this._addtag + '}';
                            }
                        }
                        out.push(`${pm} ${v}`);
                    } catch (e) {
                        console.error(`Presenting ${k} failed:`, e);
                    }
                }
            } catch (e) {
                console.error(`Failed presenting an item in data array:`, e);
            }
        return out.join("\n");
    }

}