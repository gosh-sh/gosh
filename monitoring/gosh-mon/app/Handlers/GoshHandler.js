"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ScenarioHandler_1 = __importDefault(require("./ScenarioHandler"));
const crypto_1 = __importDefault(require("crypto"));
class GoshHandler extends ScenarioHandler_1.default {
    constructor() {
        super(...arguments);
        this.seed = '';
        this.target = '';
        this.organization = '';
        this.repository = '';
        this.branch = '';
        this.filename = '';
        this.large = false;
    }
    setSeed(seed) {
        this.seed = seed;
    }
    setTargetParts(organization, repository, branch, filename, large) {
        this.target = `${organization}/${repository}/${branch}/${filename}`;
        this.organization = organization;
        this.repository = repository;
        this.branch = branch;
        this.filename = filename;
        if (large !== undefined)
            this.setLarge(large);
    }
    setTarget(target, large) {
        this.target = target;
        [this.organization, this.repository, this.branch, this.filename] = target.split('/');
        if (large !== undefined)
            this.setLarge(large);
    }
    setLarge(large = true) {
        this.large = large;
    }
    applyExtraConfiguration(c) {
        super.applyExtraConfiguration(c);
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
