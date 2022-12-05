export type MetricsMap = Map<string, number>;

/**
 * Formats MetricsMap into text string to be fed to Prometheus
 * Takes care of neccessary # HELP and # TYPE comments in output
 * Also attaches prefix and tag prefix to metrics if required
 */
export default class PrometheusFormatter {

    prefix: string = '';
    tagpfx: string = '';

    constructor(prefix: string = '', tagpfx: string = '') {
        this.prefix = prefix;
        this.tagpfx = tagpfx;
    }

    process(data: MetricsMap, debug: boolean, values_only: boolean = false): string {
        let out: string[] = [];
        let seen: Set<string> = new Set<string>();
        try {
            for (let [k, v] of data) {
                try {
                    if (v === undefined || v === null) {
                        out.push(`# WARNING: ${k} has value of ${v} !!!`);
                        continue;
                    }
                    const m = this.prefix + k;
                    const sk: string = k.includes('{') ? k.substring(0, k.indexOf('{')) : m;
                    const sm: string = this.prefix + sk;
                    if (!seen.has(sm) && !values_only) {
                        out.push(`# HELP ${sm} ${this.prefix.replaceAll('_', ' ').trimEnd()} ${sk} metric`, `# TYPE ${sm} gauge`);
                        seen.add(sm);
                    }
                    let pm = m;
                    if (this.tagpfx != '') {
                        if (m.includes('{')) {
                            pm = m.replace('{', '{' + this.tagpfx + ',');
                        } else {
                            pm = m + '{' + this.tagpfx + '}';
                        }
                    }
                    out.push(`${pm} ${v}`);
                } catch (e) {
                    console.error(`Formatting ${k} failed:`, e);
                }
            }
        } catch (e) {
            console.error(`Failed formatting data:`, e);
        }
        return out.join("\n");
    }

}
