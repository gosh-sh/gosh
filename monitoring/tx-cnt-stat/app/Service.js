"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const core_1 = require("@eversdk/core");
const Storage_1 = __importDefault(require("./Storage"));
const promises_1 = require("timers/promises");
const Utils_1 = require("./Utils");
const perf_hooks_1 = require("perf_hooks");
class Service {
    storage;
    _port = 0;
    _persist = false;
    _prefix = '';
    _networks = {};
    _multinets = {};
    _timeout = 0;
    _libtimeout = 0;
    _accesskey;
    _projectid;
    _electoraddr = '-1:3333333333333333333333333333333333333333333333333333333333333333'; // usual
    _needauth = [];
    clients = {};
    endpoints = {};
    _abis = {};
    _abimap = {};
    _nettag = 'network';
    abi_data = {};
    applied_config = [];
    busy = {};
    servicePort = () => this._port;
    metricsPrefix = () => this._prefix;
    metricsPersist = () => this._persist;
    makeStorage() {
        this.storage = new Storage_1.default(this);
        return this.storage;
    }
    applyConfigData(configData) {
        for (let k in configData) {
            if (!configData.hasOwnProperty(k))
                continue;
            this.setConfigField(k, configData[k]);
        }
        this.checkRequiredConfig();
        this.reloadABIs();
        this.rebuildEndpoints();
    }
    setConfigField(k, v) {
        // @ts-ignore
        if (this.hasOwnProperty('_' + k)) {
            // @ts-ignore
            this['_' + k] = v;
            this.applied_config.push(k);
        }
        else if (k !== 'include')
            console.warn(`Config field ${k} not found`);
    }
    checkRequiredConfig() {
        for (let k of this.requiredConfigItems()) {
            if (!this.applied_config.includes(k)) {
                throw new Error(`Required config parameter ${k} is missing`);
            }
        }
    }
    reloadABIs() {
        const template = `./config/abis/${this.serviceName()}/*.abi.json`;
        this.abi_data = {};
        for (let k in this._abis) {
            if (!this._abis.hasOwnProperty(k))
                continue;
            const path = template.replace('*', this._abis[k]);
            this.abi_data[k] = (0, core_1.abiJson)(fs_1.default.readFileSync(path, 'utf8'));
        }
        for (let k in this._abimap) {
            if (!this._abimap.hasOwnProperty(k))
                continue;
            this.abi_data[k] = this.abi_data[this._abimap[k]];
        }
    }
    rebuildEndpoints() {
        this.endpoints = {};
        for (let net in this._networks) {
            if (!this._networks.hasOwnProperty(net))
                continue;
            this.endpoints[net] = this._networks[net];
        }
        for (let net in this._multinets) {
            if (!this._multinets.hasOwnProperty(net))
                continue;
            for (let ep in this._multinets[net]) {
                if (!this._multinets[net].hasOwnProperty(ep))
                    continue;
                this.endpoints[`${net}-${ep}`] = this._multinets[net][ep];
            }
        }
    }
    prepare() {
        for (let ep in this.endpoints) {
            if (!this.endpoints.hasOwnProperty(ep))
                continue;
            let accesskey = undefined;
            let endpoint = this.endpoints[ep];
            const net = ep.indexOf('-') === -1 ? ep : ep.substring(0, ep.indexOf('-'));
            if (this._needauth.includes(net)) {
                accesskey = this._accesskey;
                endpoint = endpoint + '/' + this._projectid;
            }
            try {
                this.clients[ep] = new core_1.TonClient({
                    network: {
                        endpoints: [endpoint],
                        message_processing_timeout: this._libtimeout,
                        wait_for_timeout: this._libtimeout,
                        query_timeout: this._libtimeout,
                        access_key: accesskey
                    }
                });
            }
            catch (e) {
                console.error(`Failed to initialize endpoint ${ep}: ${endpoint}`);
                process.exit(1);
            }
        }
        const clients = this.clients;
        process.on('SIGTERM', function () {
            for (const client of Object.values(clients)) {
                try {
                    client?.close();
                }
                catch { }
            }
            process.exit(0);
        });
    }
    async execute() {
        const proms = [];
        const sta = perf_hooks_1.performance.now();
        console.log(`Execute start`);
        for (let ep in this.endpoints) {
            if (!this.endpoints.hasOwnProperty(ep))
                continue;
            proms.push(Promise.race([
                this.processWrapper(this.clients[ep], ep),
                this.raceNetwork(ep)
            ]));
        }
        const results = await Promise.allSettled(proms);
        const end = perf_hooks_1.performance.now();
        console.log(`Execute end in ${end - sta} ms`);
        return results.filter(r => r.status == 'fulfilled').map(r => r.value);
    }
    async raceNetwork(name) {
        await (0, promises_1.setTimeout)(this._timeout);
        const last = this.storage.get(name);
        if (last === undefined)
            // throw new Error('Timed out and have no last value');
            return this.addNetworkTags(null, name, 0, 'race_timeout');
        // return last;
        return this.addNetworkTags(last, name, 0, 'race_timeout');
    }
    async waitForResult(name) {
        for (let i = 0; i < (this._timeout / 500) + 1; i++) {
            const last = this.storage.get(name);
            if (last)
                return this.addNetworkTags(last, name, this.storage.is_hot(name) ? 1 : 0);
            await (0, promises_1.setTimeout)(500);
        }
        // throw new Error('Timed out waiting for result');
        return this.addNetworkTags(null, name, 0, 'busy_timeout');
    }
    async processWrapper(client, name) {
        const last = this.storage.get(name);
        if (this.busy[name])
            return await this.waitForResult(name);
        this.busy[name] = true;
        try {
            const dp = ((0, Utils_1.env)('DEBUG_PERF', '0') != '0');
            const metrics = this.filterLast(last);
            const perfFun = async (k, f) => {
                const sta = perf_hooks_1.performance.now();
                let res = null;
                if (dp)
                    console.log(`Perf: start ${name} -> ${k}`);
                try {
                    res = await f;
                }
                catch (e) {
                    if (dp)
                        console.log(`Perf: fail ${name} -> ${k}`);
                    throw e;
                }
                const end = perf_hooks_1.performance.now();
                if (dp)
                    console.log(`Perf: end ${name} -> ${k} in ${end - sta}`);
                let metr = k;
                let args = '';
                if (k.includes(' ')) {
                    metr = k.substring(0, k.indexOf(' '));
                    args = ',' + k.substring(k.indexOf(' ') + 1);
                }
                const key = `perf{met="${metr}"${args}}`;
                const base = metrics.has(key) ? metrics.get(key) : 0;
                metrics.set(key, base + (end - sta));
                if (res) {
                    if (res.data)
                        return res.data;
                    if (res.result && res.result.data)
                        return res.result.data;
                    if (res.result)
                        return res.result;
                }
                return res;
            };
            const sta = perf_hooks_1.performance.now();
            await this.processNetwork(client, name, metrics, perfFun);
            const end = perf_hooks_1.performance.now();
            metrics.set(`allperf`, end - sta);
            this.storage.store(name, metrics);
            console.log(`Processing ${name} success: ${end - sta} ms`);
            return this.addNetworkTags(metrics, name, 1);
        }
        catch (e) {
            console.error(`Processing ${name} failed:`, e);
            if (last)
                return this.addNetworkTags(last, name, 0, e.message ?? e.toString());
            // throw e;
            return this.addNetworkTags(null, name, 0, e.message ?? e.toString());
        }
        finally {
            this.busy[name] = false;
        }
    }
    addNetworkTags(metrics, name, working, reason) {
        const res = new Map([[this.addNetworkTag('working', name), working]]);
        if (reason)
            res.set(this.addNetworkTag(`not_working_at{reason="${reason.replaceAll('"', "'")}"}`, name), (0, Utils_1.now)());
        if (metrics)
            for (let [k, v] of metrics)
                res.set(this.addNetworkTag(k, name), v);
        return res;
    }
    filterLast(last) {
        const m = new Map();
        if (last) {
            for (let [k, v] of last) {
                const klv = this.keepLast(k, v, (p) => k.startsWith(p));
                if (klv === true)
                    m.set(k, v);
                else if (klv !== undefined && klv !== false)
                    m.set(k, klv);
            }
        }
        return m;
    }
    measureStats(m, field, key, data, pfx) {
        const stats = {};
        for (let block of data) {
            const st_value = block[field];
            if (stats[st_value] === undefined)
                stats[st_value] = 0;
            stats[st_value] += 1;
        }
        for (const [stat_value, stat_count] of Object.entries(stats)) {
            m.set(`${pfx}_stat_${key}{value="${stat_value}"}`, stat_count);
        }
    }
    measureStats2(m, field1, field2, key1, key2, data, pfx) {
        const stats = {};
        for (let block of data) {
            const st_value = block[field1] + '###' + block[field2];
            if (stats[st_value] === undefined)
                stats[st_value] = 0;
            stats[st_value] += 1;
        }
        for (const [stat_value, stat_count] of Object.entries(stats)) {
            const spl = stat_value.split('###');
            m.set(`${pfx}_stat_${key1}_${key2}{value1="${spl[0]}",value2="${spl[1]}"}`, stat_count);
        }
    }
    measureStatsSignatures(m, data, pfx) {
        const stats = {};
        for (let block of data) {
            if (block['signatures'] && block['signatures']['signatures']) {
                for (let bss of block['signatures']['signatures']) {
                    const st_value = bss['node_id'];
                    if (stats[st_value] === undefined)
                        stats[st_value] = 0;
                    stats[st_value] += 1;
                }
            }
        }
        for (const [stat_value, stat_count] of Object.entries(stats)) {
            m.set(`${pfx}_stat_blksigs{value="${stat_value}"}`, stat_count);
        }
    }
    requiredConfigItems() { return ['port', 'prefix', 'timeout', 'libtimeout']; }
    keepLast(k, v, p) { return true; }
    addNetworkTag(k, n) {
        const i = n.indexOf('-');
        if (i !== -1) {
            return (0, Utils_1.add_tag)(k, `${this._nettag}="${n.substring(0, i)}",endpoint="${n.substring(i + 1)}"`);
        }
        return (0, Utils_1.add_tag)(k, `${this._nettag}="${n}"`);
    }
}
exports.default = Service;
