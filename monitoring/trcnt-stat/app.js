const fs   = require('fs');
const fsp  = require('fs').promises;
const yaml = require('js-yaml');
const crypto = require('crypto');

const express = require('express');

const { performance } = require('perf_hooks');

const app = express();
const router = express.Router();

const { TONClient } = require('ton-client-node-js');

const metrics_pfx = 'trcnt_stat_';

BigInt.prototype.toJSON = function() { return this.toString() }

// Access logging (debug)
router.use(function (req,res,next) {
    console.log(req.connection.remoteAddress + ' ' + req.method + ' ' + req.path);
    next();
});

let conf = {};
try {
    conf = yaml.load(fs.readFileSync('./config/targets.yml', 'utf8'));
    console.log('Loaded targets configuration');
} catch (e) {
    console.error("Failed to load targets configuration", e);
    process.exit(1);
}

const metrics = {};
const clients = [];
let umi = null;
let syncing = false;
let updateMetrics = function() {};

function shsh(shard) {
    return shard.replace(/0+$/, "");
}

async function checkNet(net_name, net_data, m_old) {
    const net = `network="${net_name}"`;
    if (net_data.client === null) {
        console.log('Reconnecting to network ' + net_name + ' at ' + net_data.config.endpoint);
        net_data.client = await TONClient.create({servers: [net_data.config.endpoint]});
    }
    clients.push(net_data.client);
    const client = net_data.client;
    const m = {};
    if (m_old !== undefined) {
        for (const i in m_old) {
            if (!m_old.hasOwnProperty(i)) continue;
            m[i] = m_old[i];
        }
    }
    m[`updated{${net}}`] = Math.trunc(Date.now() / 1000);
    const reqs = {};
    let query = [];
    const mkval = function(x) {
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
    for (let value_spec of net_data.config.values) {
        const vs = value_spec.toString();
        const vk = vs.replace('-', '_').replace('^','_').replaceAll('.', '_');
        const va = vs.split('-');
        let min_value = 0, max_value = 0;
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
    const result = await client.queries.query('query { ' + query.join(' ') + ' }');
    // console.log(result['data']);
    for (let value_spec of net_data.config.values) {
        const vs = value_spec.toString();
        const vk = vs.replace('-', '_').replace('^','_').replaceAll('.', '_');
        m[`res{${net},range="${vs}"}`] = result['data']['r'+vk][0];
    }
    return m;
}

// ---------------------------------------------------------------------------------------------------------------------

async function main() {
    const nets = {};
    for (const n in conf.networks) {
        if (!conf.networks.hasOwnProperty(n)) continue;
        const ni = conf.networks[n];
        nets[n] = {'config': ni};
        console.log('Connecting to network ' + n + ' at ' + ni.endpoint);
        const client = nets[n]['client'] = await TONClient.create({servers:[ni.endpoint]});
        clients.push(client);
    }
    updateMetrics = function() {
        for (const n in nets) {
            if (!nets.hasOwnProperty(n)) continue;
            const sta = performance.now();
            checkNet(n, nets[n], metrics[n]).then(value => {
                metrics[n] = value;
                const end = performance.now();
                console.log(`*** Updated metrics for ${n} in ${(end - sta)/1000} seconds`);
                // console.log(value);
            }).catch(
                reason => {
                    console.warn(`Update ${n} failed: ${reason}`);
                    /*
                    if (nets[n].client !== null) {
                        if (clients.includes(nets[n].client))
                            clients.splice(clients.indexOf(nets[n].client), 1);
                        try {nets[n].client.close();} catch {}
                        nets[n].client = null;
                    }
                    Does more harm than good.
                    */
                });
        }
    }
    umi = setInterval(updateMetrics, 15000);
    updateMetrics();
    console.log('Connections established');
    return 0;
}

let synced = false;
router.get('/metrics', function(req, res){
    const lines = [];
    const initd = [];
    for (const n in metrics) {
        if (!metrics.hasOwnProperty(n)) continue;
        for (const m in metrics[n]) {
            if (!metrics[n].hasOwnProperty(m)) continue;
            const metr = metrics_pfx + m;
            const smn = metr.substr(0, metr.indexOf('{'));
            const vsmn = m.substr(0, m.indexOf('{'));
            if (!initd.includes(smn)) {
                initd.push(smn);
                lines.push(`# HELP ${smn} frmon metric ${vsmn}`);
                lines.push(`# TYPE ${smn} gauge`);
            }
            lines.push(`${metr} ${metrics[n][m]}`);
        }
    }
    res.send(lines.join("\n"));
    if (!syncing) {
        // console.log('Re-synchronized to monitoring');
        syncing = true;
        clearInterval(umi);
        setTimeout(() => {
            syncing = false;
            umi = setInterval(updateMetrics, 15000);
            updateMetrics();
        }, 12500);
    }
});

process.on('SIGTERM', function() {
    for (const i in clients) {
        if (clients.hasOwnProperty(i))
            try {clients[i].close();} catch {}
    }
    process.exit(0);
});

main().then(value => console.log('Main done (' + value + ')'))
      .catch(reason => console.error('Main crashed', reason));

app.use('/', router);

app.listen(9123, function () {
    console.log('transaction count stats metrics published on port 9123')
});