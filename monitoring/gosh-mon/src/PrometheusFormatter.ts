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

    process(data: MetricsMap, debug: boolean): string {
        let out: string[] = [];
        let seen: Set<string> = new Set<string>();
        for (let [k, v] of data) {
            const m = this.prefix + k;
            if (!seen.has(m) && !debug) {
                out.push(`# HELP ${m} ${this.prefix.replaceAll('_', ' ').trimEnd()} ${k} metric`, `# TYPE ${m} gauge`);
                seen.add(m);
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
        }
        return out.join("\n");
    }

}
