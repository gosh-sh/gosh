import Dict = NodeJS.Dict;
import fs from "fs";
import {Metric, MetricsMap} from "./Presentation";
import {Abi, abiJson, TonClient} from "@eversdk/core";
import Storage from "./Storage";
import {setTimeout} from 'timers/promises'
import {add_tag, env, now} from "./Utils";
import {performance} from "perf_hooks";

export type FunStrBool = ((p: string) => boolean);

export type PerfFun = ((k: string, f: Promise<any>) => Promise<any>);

export default abstract class Service {

    protected storage!: Storage;

    protected _port: number = 0;
    protected _persist: boolean = false;
    protected _prefix: string = '';

    protected _networks: Dict<string> = {};
    protected _multinets: Dict<Dict<string>> = {};

    protected _timeout: number = 0;
    protected _libtimeout: number = 0;

    protected _accesskey?: string;
    protected _projectid?: string;
    protected _needauth: string[] = [];

    protected clients: Dict<TonClient> = {};
    protected endpoints: Dict<string> = {};

    protected _abis: Dict<string> = {};
    protected _abimap: Dict<string> = {};

    protected _nettag: string = 'network';

    protected abi_data: Dict<Abi> = {};

    private applied_config: Array<string> = [];
    private busy: Dict<boolean> = {};

    servicePort = (): number => this._port;
    metricsPrefix = (): string => this._prefix;
    metricsPersist = (): boolean => this._persist;

    makeStorage(): Storage {
        this.storage = new Storage(this);
        return this.storage;
    }

    applyConfigData(configData: any) {
        for (let k in configData) {
            if (!configData.hasOwnProperty(k))
                continue;
            this.setConfigField(k, configData[k]);
        }
        this.checkRequiredConfig();
        this.reloadABIs();
        this.rebuildEndpoints();
    }

    private setConfigField(k: string, v: any) {
        // @ts-ignore
        if (this.hasOwnProperty('_' + k)) {
            // @ts-ignore
            this['_' + k] = v;
            this.applied_config.push(k);
        } else if (k !== 'include')
            console.warn(`Config field ${k} not found`);
    }

    protected checkRequiredConfig() {
        for (let k of this.requiredConfigItems()) {
            if (!this.applied_config.includes(k)) {
                throw new Error(`Required config parameter ${k} is missing`);
            }
        }
    }

    protected reloadABIs() {
        const template = `./config/abis/${this.serviceName()}/*.abi.json`;
        this.abi_data = {};
        for (let k in this._abis) {
            if (!this._abis.hasOwnProperty(k)) continue;
            const path = template.replace('*', this._abis[k]!);
            this.abi_data[k] = abiJson(fs.readFileSync(path, 'utf8'));
        }
        for (let k in this._abimap) {
            if (!this._abimap.hasOwnProperty(k)) continue;
            this.abi_data[k] = this.abi_data[this._abimap[k]!];
        }
    }

    protected rebuildEndpoints() {
        this.endpoints = {};
        for (let net in this._networks) {
            if (!this._networks.hasOwnProperty(net)) continue;
            this.endpoints[net] = this._networks[net];
        }
        for (let net in this._multinets) {
            if (!this._multinets.hasOwnProperty(net)) continue;
            for (let ep in this._multinets[net]) {
                if (!this._multinets[net]!.hasOwnProperty(ep)) continue;
                this.endpoints[`${net}-${ep}`] = this._multinets[net]![ep];
            }
        }
    }

    prepare() {
        for (let ep in this.endpoints) {
            if (!this.endpoints.hasOwnProperty(ep)) continue;
            let accesskey = undefined;
            let endpoint = this.endpoints[ep]!;
            const net = ep.indexOf('-') === -1 ? ep : ep.substring(0, ep.indexOf('-'));
            if (this._needauth.includes(net)) {
                accesskey = this._accesskey;
                endpoint = endpoint + '/' + this._projectid;
            }
            try {
                this.clients[ep] = new TonClient({
                    network: {
                        endpoints: [endpoint],
                        message_processing_timeout: this._libtimeout,
                        wait_for_timeout: this._libtimeout,
                        query_timeout: this._libtimeout,
                        access_key: accesskey
                    }
                });
            } catch (e) {
                console.error(`Failed to initialize endpoint ${ep}: ${endpoint}`);
                process.exit(1);
            }
        }
        const clients = this.clients;
        process.on('SIGTERM', function() {
            for (const client of Object.values(clients)) {
                try { client?.close(); } catch {}
            }
            process.exit(0);
        });
    }

    async execute(): Promise<Array<MetricsMap>> {
        const proms = [];
        const sta = performance.now();
        console.log(`Execute start`);
        for (let ep in this.endpoints) {
            if (!this.endpoints.hasOwnProperty(ep)) continue;
            proms.push(
                Promise.race([
                    this.processWrapper(this.clients[ep]!, ep),
                    this.raceNetwork(ep)
                ])
            );
        }
        const results = await Promise.allSettled(proms);
        const end = performance.now();
        console.log(`Execute end in ${end - sta} ms`);
        return results.filter(r => r.status == 'fulfilled').map(r => (<PromiseFulfilledResult<MetricsMap>>r).value);
    }

    protected async raceNetwork(name: string): Promise<MetricsMap> {
        await setTimeout(this._timeout);
        const last = this.storage.get(name);
        if (last === undefined)
            // throw new Error('Timed out and have no last value');
            return this.addNetworkTags(null, name, 0, 'race_timeout');
        // return last;
        return this.addNetworkTags(last, name, 0, 'race_timeout');
    }

    protected async waitForResult(name: string): Promise<MetricsMap> {
        for (let i = 0; i < (this._timeout / 500) + 1; i++) {
            const last = this.storage.get(name);
            if (last)
                return this.addNetworkTags(last, name, this.storage.is_hot(name) ? 1 : 0);
            await setTimeout(500);
        }
        // throw new Error('Timed out waiting for result');
        return this.addNetworkTags(null, name, 0, 'busy_timeout');
    }

    protected async processWrapper(client: TonClient, name: string): Promise<MetricsMap> {
        const last = this.storage.get(name);
        if (this.busy[name])
            return await this.waitForResult(name);
        this.busy[name] = true;
        try {
            const dp = (env('DEBUG_PERF', '0') != '0');
            const metrics = this.filterLast(last);
            const perfFun = async (k: string, f: Promise<any>): Promise<any> => {
                const sta = performance.now();
                let res = null;
                if (dp) console.log(`Perf: start ${name} -> ${k}`);
                try { res = await f; }
                catch (e) { if (dp) console.log(`Perf: fail ${name} -> ${k}`); throw e; }
                const end = performance.now();
                if (dp) console.log(`Perf: end ${name} -> ${k} in ${end - sta}`);
                let metr = k;
                let args = '';
                if (k.includes(' ')) {
                    metr = k.substring(0, k.indexOf(' '));
                    args = ',' + k.substring(k.indexOf(' ') + 1);
                }
                const key = `perf{met="${metr}"${args}}`;
                const base = metrics.has(key) ? metrics.get(key) : 0;
                metrics.set(key, <number>base + (end - sta));
                if (res) {
                    if (res.data) return res.data;
                    if (res.result && res.result.data) return res.result.data;
                    if (res.result) return res.result;
                }
                return res;
            };
            const sta = performance.now();
            await this.processNetwork(client, name, metrics, perfFun);
            const end = performance.now();
            metrics.set(`allperf`, end - sta);
            this.storage.store(name, metrics);
            console.log(`Processing ${name} success: ${end - sta} ms`);
            return this.addNetworkTags(metrics, name, 1);
        } catch (e: any) {
            console.error(`Processing ${name} failed:`, e);
            if (last)
                return this.addNetworkTags(last, name, 0, e.message ?? e.toString());
            // throw e;
            return this.addNetworkTags(null, name, 0, e.message ?? e.toString());
        } finally {
            this.busy[name] = false;
        }
    }

    protected addNetworkTags(metrics: MetricsMap|null, name: string, working: number, reason?: string): MetricsMap {
        const res: MetricsMap = new Map([[this.addNetworkTag('working', name), working]]);
        if (reason)
            res.set(this.addNetworkTag(`not_working_at{reason="${reason.replaceAll('"', "'")}"}`, name), now());
        if (metrics)
            for (let [k, v] of metrics)
                res.set(this.addNetworkTag(k, name), v);
        return res;
    }

    protected filterLast(last?: MetricsMap): MetricsMap {
        const m = new Map();
        if (last) {
            for (let [k, v] of last) {
                const klv = this.keepLast(k, v, (p: string) => k.startsWith(p));
                if (klv === true)
                    m.set(k, v);
                else if (klv !== undefined && klv !== false)
                    m.set(k, klv);
            }
        }
        return m;
    }

    abstract serviceName(): string;
    protected requiredConfigItems(): Array<string> { return ['port', 'prefix', 'timeout', 'libtimeout']; }
    protected abstract processNetwork(client: TonClient, name: string, m: MetricsMap, p: PerfFun): Promise<void>;
    protected keepLast(k: string, v: Metric, p: FunStrBool): any { return true; }
    protected addNetworkTag(k: string, n: string) {
        const i = n.indexOf('-');
        if (i !== -1) {
            return add_tag(k, `${this._nettag}="${n.substring(0, i)}",endpoint="${n.substring(i+1)}"`)
        }
        return add_tag(k, `${this._nettag}="${n}"`);
    }

}