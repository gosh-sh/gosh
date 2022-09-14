"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Formats MetricsMap into text string to be fed to Prometheus
 * Takes care of neccessary # HELP and # TYPE comments in output
 * Also attaches prefix and tag prefix to metrics if required
 */
class PrometheusFormatter {
    constructor(prefix = '', tagpfx = '') {
        this.prefix = '';
        this.tagpfx = '';
        this.prefix = prefix;
        this.tagpfx = tagpfx;
    }
    process(data, debug) {
        let out = [];
        let seen = new Set();
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
                }
                else {
                    pm = m + '{' + this.tagpfx + '}';
                }
            }
            out.push(`${pm} ${v}`);
        }
        return out.join("\n");
    }
}
exports.default = PrometheusFormatter;
