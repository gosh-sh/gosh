"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ScenarioHandler_1 = __importDefault(require("./ScenarioHandler"));
const crypto_1 = __importDefault(require("crypto"));
const node_fetch_1 = __importDefault(require("node-fetch"));
class GoshHandler extends ScenarioHandler_1.default {
    constructor() {
        super(...arguments);
        this.seed = '';
        this.target = '';
        this.organization = '';
        this.repository = '';
        this.branch = '';
        this.filename = '';
        this.username = '';
        this.large = false;
        this.appurl = 'https://app.gosh.sh/';
        this.root = '';
        this.ipfs_address = '';
        this.prim_network = '';
        this.conf_endpoint = '';
        this.use_envs = '';
        this.large_sha1_cnt = 1111;
    }
    async requestEnvs() {
        // require | priority | fallback | disabled
        const eset = this.use_envs;
        if (eset !== 'disabled') {
            try {
                const appurl = this.appurl.endsWith('/') ? this.appurl : this.appurl + '/';
                const res = await (0, node_fetch_1.default)(appurl + 'envs.json');
                const jr = await res.json();
                let gosh = jr.gosh;
                if (gosh && gosh.startsWith('{')) {
                    gosh = JSON.parse(gosh);
                    const gk = Object.keys(gosh);
                    gosh = gosh[gk[gk.length - 1]];
                }
                const p = (eset === 'require') || (eset === 'priority');
                this.ipfs_address = !p ? (this.ipfs_address ?? jr.ipfs) : (jr.ipfs ?? this.ipfs_address);
                this.root = !p ? (this.root ?? gosh) : (gosh ?? this.root);
                this.conf_endpoint = !p ? (this.conf_endpoint ?? jr.network) : (jr.network ?? this.conf_endpoint);
                this.say(`resolved ipfs ${this.ipfs_address}, root ${this.root}, endpoint ${this.conf_endpoint}`);
            }
            catch (e) {
                if (eset === 'require')
                    throw e;
            }
        }
    }
    applyConfiguration(c) {
        super.applyConfiguration(c);
        this.useFields(c, ['seed', 'organization', 'repository', 'branch', 'filename', 'large'], ['username', 'appurl', 'root', 'ipfs_address', 'prim_network', 'conf_endpoint', 'use_envs', 'large_sha1_cnt']);
        this.target = `${this.organization}/${this.repository}/${this.branch}/${this.filename}`;
        return this;
    }
    goshDescribe() {
        return this.target + (this.large ? ', IPFS' : '');
    }
    async processFileContents(contents) {
        const fileContents = contents ?? await this.getClipboard();
        if (this.large) {
            const lines = fileContents.split('\n').map(v => v.trimEnd());
            const readTail = lines.slice(2).join('');
            const expected = GoshHandler.makeTail(lines[0], false, this.large_sha1_cnt);
            if (readTail !== expected) {
                const shorter = function (s) {
                    if (s.length < 500)
                        return `${s} (length: ${s.length})`;
                    return `${s.substring(0, 500)}.....${s.substring(s.length - 500)} (length: ${s.length})`;
                };
                this.say('Read file contents do not match the expected');
                this.say('Expc: ' + shorter(expected));
                this.say('Read: ' + shorter(readTail));
                this.say('Lin0: ' + shorter(lines[0]));
                throw new TypeError('Data tail is corrupted');
            }
            return Number.parseInt(lines[0]);
        }
        else {
            return Number.parseInt(fileContents.trim());
        }
    }
    prepareFileContents() {
        const now_str = (Math.trunc(Date.now() / 1000)).toString();
        return this.large ? (now_str + '\n\n' + GoshHandler.makeTail(now_str, true, this.large_sha1_cnt)) : now_str;
    }
    static sha1(data) {
        return crypto_1.default.createHash("sha1").update(data, "binary").digest("hex");
    }
    static makeTail(data, blocky = false, hashes = 1111) {
        let h = GoshHandler.sha1(data);
        for (let i = 0; i < hashes; i++)
            h += GoshHandler.sha1(h);
        const tail = Buffer.from(h, 'hex').toString('base64')
            .replaceAll('/', '_').replaceAll('+', '-').replaceAll('=', '');
        return blocky ? tail.match(/.{1,100}/g).join('\n') : tail;
    }
}
exports.default = GoshHandler;
