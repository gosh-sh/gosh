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
    }
    async requestEnvs() {
        // require | priority | fallback | disabled
        const eset = this.use_envs;
        if (eset !== 'disabled') {
            try {
                const res = await (0, node_fetch_1.default)(this.appurl + '/envs.json');
                const jr = await res.json();
                const p = (eset === 'require') || (eset === 'priority');
                this.ipfs_address = !p ? (this.ipfs_address ?? jr.ipfs) : (jr.ipfs ?? this.ipfs_address);
                this.root = !p ? (this.root ?? jr.gosh) : (jr.gosh ?? this.root);
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
        this.useFields(c, ['seed', 'organization', 'repository', 'branch', 'filename', 'large'], ['username', 'appurl', 'root', 'ipfs_address', 'prim_network', 'conf_endpoint', 'use_envs']);
        this.target = `${this.organization}/${this.repository}/${this.branch}/${this.filename}`;
        return this;
    }
    goshDescribe() {
        return this.target + (this.large ? ', IPFS' : '');
    }
    async processFileContents(contents) {
        const fileContents = contents ?? await this.copy();
        if (this.large) {
            const lines = fileContents.split('\n').map(v => v.trimEnd());
            const readTail = lines.slice(2).join('');
            if (readTail !== GoshHandler.makeTail(lines[0]))
                throw new TypeError('Data tail is corrupted');
            return Number.parseInt(lines[0]);
        }
        else {
            return Number.parseInt(fileContents.trim());
        }
    }
    prepareFileContents() {
        const now_str = (Math.trunc(Date.now() / 1000)).toString();
        return this.large ? (now_str + '\n\n' + GoshHandler.makeTail(now_str, true)) : now_str;
    }
    static sha1(data) {
        return crypto_1.default.createHash("sha1").update(data, "binary").digest("hex");
    }
    static makeTail(data, blocky = false) {
        let h = GoshHandler.sha1(data);
        for (let i = 0; i < 1111; i++)
            h += GoshHandler.sha1(h);
        const tail = Buffer.from(h, 'hex').toString('base64')
            .replaceAll('/', '_').replaceAll('+', '-').replaceAll('=', '');
        return blocky ? tail.match(/.{1,100}/g).join('\n') : tail;
    }
}
exports.default = GoshHandler;
