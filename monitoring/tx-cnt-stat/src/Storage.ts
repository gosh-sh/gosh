import Service from "./Service";
import {MetricsMap} from "./Presentation";
import Dict = NodeJS.Dict;
import fs from "fs";

export default class Storage {

    protected _name: string = '';
    protected _persist: boolean = false;

    protected metrics: Dict<MetricsMap> = {};
    protected hot: Dict<boolean> = {};

    constructor(service: Service) {
        this._name = service.serviceName();
        this._persist = service.metricsPersist();
    }

    store(name: string, metrics: MetricsMap) {
        this.metrics[name] = metrics;
        this.hot[name] = true;
        if (this._persist)
            fs.writeFileSync(`./persist/${this._name}-${name}.json`, JSON.stringify(Array.from(metrics.entries())), 'utf-8');
    }

    get(name: string): MetricsMap | undefined {
        if (!this.metrics[name] && this._persist) {
            if (fs.existsSync(`./persist/${this._name}-${name}.json`)) {
                this.metrics[name] = new Map(JSON.parse(fs.readFileSync(`./persist/${this._name}-${name}.json`, 'utf-8')));
            }
        }
        return this.metrics[name];
    }

    is_hot(name: string): boolean {
        return this.hot[name] === true;
    }

}