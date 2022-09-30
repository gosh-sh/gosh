"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const GoshHandler_1 = __importDefault(require("./GoshHandler"));
const fs = __importStar(require("fs"));
const util = __importStar(require("util"));
const child_process = __importStar(require("child_process"));
const Utils_1 = require("../Utils");
const exec = util.promisify(child_process.exec);
const node_fetch_1 = __importStar(require("node-fetch"));
const stream_1 = require("stream");
const streamPipeline = util.promisify(stream_1.pipeline);
class RemoteHandler extends GoshHandler_1.default {
    constructor() {
        super(...arguments);
        this.gosh_branch = '';
        this.gosh_repo_url = '';
        this.gosh_bin_path = '';
        this.release_asset = '';
        this.github_user = '';
        this.github_token = '';
        this.address = '';
        this.pubkey = '';
        this.secret = '';
    }
    applyConfiguration(c) {
        super.applyConfiguration(c);
        this.useFields(c, ['gosh_branch', 'gosh_repo_url', 'pubkey', 'secret'], ['gosh_bin_path', 'release_asset', 'github_user', 'github_token', 'address']);
        return this;
    }
    async copyFile(src, dst) {
        this.say(`[${this.stepsDone}] Copy file ${src} -> ${dst}`);
        await fs.copyFileSync(src, dst);
    }
    async copyTemplFile(src, dst, args) {
        let data = fs.readFileSync(src, 'utf-8');
        const idata = data;
        for (let [k, v] of Object.entries(args)) {
            data = data.replaceAll('${' + k + '}', v);
        }
        fs.writeFileSync(dst, data, 'utf-8');
        if (Number.parseInt(process.env.ONESHOT_DEBUG ?? '0') >= 3) {
            console.log(`Source file: ${src}:\n${idata}`);
            console.log('Template parameters:');
            for (let [k, v] of Object.entries(args)) {
                console.log(`    ${k} = ${v}`);
            }
            console.log(`Written templated file to ${dst}:\n${data}`);
        }
    }
    async ensureDir(dir) {
        this.say(`[${this.stepsDone}] Ensure dir ${dir}`);
        if (!fs.existsSync(dir))
            await fs.mkdirSync(dir);
    }
    async deleteDir(dir) {
        this.say(`[${this.stepsDone}] Delete dir ${dir}`);
        if (fs.existsSync(dir))
            await exec('rm -rf ' + dir);
    }
    async nop() { }
    async execute(cmdargs, cwd, loud = false) {
        const step = this.stepsDone;
        this.say(`[${step}] Execute [${cmdargs.join(', ')}] in ${cwd ?? '<current>'} dir`, loud);
        const params = (cwd !== undefined) ? { cwd: cwd } : {};
        if (this.started != 0 && this.timeout != 0) {
            params.timeout = Math.max((this.started + this.timeout) - (0, Utils_1.now)(), 1) * 1000;
            params.killSignal = "SIGINT";
        }
        const cmd = cmdargs[0], args = cmdargs.slice(1);
        const process = child_process.spawn(cmd, args, params);
        process.stdout.on('data', (data) => {
            this.say(`[${step}o] ${data}`, loud);
        });
        process.stderr.on('data', (data) => {
            this.say(`[${step}e] ${data}`, loud);
        });
        const prom = new Promise((resolve, reject) => {
            process.on('close', (code) => {
                this.say(`[${step}] Closed all stdio with code ${code}`, loud);
            });
            process.on('exit', (code) => {
                this.say(`[${step}] Exited with code ${code}`, loud);
                if (code == 0)
                    resolve(true);
                else
                    reject('failed with exit code ' + code);
            });
            process.on('error', (err) => {
                this.say(`[${step}] Error occured: ${err}`, loud);
                reject(err);
            });
        });
        await prom;
        // const { stdout, stderr } = await exec(cmd, params);
        // if (loud) {
        //     console.log("> Execution result for " + cmd + (cwd ? " in " + cwd : ""));
        //     console.log(">>> stdout:\n" + stdout);
        //     console.log(">>> stderr:\n" + stderr);
        // }
    }
    get_git_url(repo_path) {
        if (!fs.existsSync(repo_path + '/.git/config'))
            return '';
        const conf = fs.readFileSync(repo_path + '/.git/config', 'utf-8');
        const lines = conf.split('\n');
        for (const l of lines) {
            const line = l.trim();
            // origin should be the first remote
            if (line.startsWith('url = '))
                return line.substring(6);
        }
        return '';
    }
    repoDir() {
        return `data/temp/${this.repository}-${this.branch}-${this.startedms}`;
    }
    getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    initialSteps(debug) {
        return this.gosh_branch.startsWith('release:') ?
            this.initialStepsFromRelease(debug) :
            this.initialStepsFromRepository(debug);
    }
    initialStepsFromRelease(debug) {
        let data = null;
        let updated = '';
        let download = '';
        return [
            'ensure .gosh dir', /* 0*/ () => this.ensureDir('../.gosh'),
            'request envs', /* 1*/ () => this.requestEnvs(),
            'config template', /* 2*/ () => this.copyTemplFile('config/template/config.json', '../.gosh/config.json', {
                'pubkey': this.pubkey, 'secret': this.secret, 'ipfs_address': this.ipfs_address,
                'prim_network': this.prim_network, 'conf_endpoint': this.conf_endpoint.replaceAll(',', '", "')
            }),
            'random wait', () => this.nodeWait(this.getRandomInt(1000, 5000)),
            'query release', /* 3*/ async () => {
                // https://github.com/<organization>/<repository>.git
                const split = this.gosh_repo_url.split('/');
                const orgrepo = split[3] + '/' + split[4].replace('.git', '');
                const release_name = this.gosh_branch.replace('release:', '');
                const url = (release_name === 'latest-prerelease') ?
                    `https://api.github.com/repos/${orgrepo}/releases` :
                    `https://api.github.com/repos/${orgrepo}/releases/${release_name}`;
                const etag = fs.existsSync('data/last-etag') ? fs.readFileSync('data/last-etag', 'utf-8') : '';
                const headers = new node_fetch_1.Headers();
                if (this.github_user !== '' && this.github_token !== '')
                    headers.set('Authorization', 'Basic ' + Buffer.from(`${this.github_user}:${this.github_token}`).toString('base64'));
                if (etag !== '' && fs.existsSync('./data/last-git-remote-gosh') && fs.existsSync('data/last-updated'))
                    headers.set('If-None-Match', etag);
                const response = await (0, node_fetch_1.default)(url, { headers: headers });
                if (!response.ok) {
                    if (response.statusText === 'Not Modified') {
                        this.say("github conditional result: not modified", true);
                        data = null;
                    }
                    else if (response.statusText != 'rate limit exceeded')
                        throw new Error(`unexpected response ${response.statusText} for request ${url}`);
                    else {
                        this.say("warning: github rate limit exceeded", true);
                        for (let [k, v] of response.headers)
                            if (k.startsWith('x-ratelimit'))
                                this.say(`header ${k}: ${v}`, true);
                        data = null;
                    }
                }
                else {
                    data = await response.json();
                    let sel = null;
                    if (release_name === 'latest-prerelease') {
                        for (let r of data) {
                            if (r.prerelease) {
                                this.say('selected first prerelease ' + r.name);
                                sel = r;
                                break;
                            }
                        }
                        if (!sel)
                            throw new Error('Prerelease not found');
                        else
                            data = sel;
                    }
                    for (let [k, v] of response.headers) {
                        if (k === 'etag') {
                            fs.writeFileSync('data/last-etag', v, 'utf-8');
                            break;
                        }
                    }
                }
            },
            'find release', /* 4*/ async () => {
                if (!data)
                    return;
                let found = false;
                for (let a of data['assets']) {
                    if (a['name'] == this.release_asset) {
                        found = true;
                        updated = a['updated_at'];
                        download = a['browser_download_url'];
                        break;
                    }
                }
                if (!found) {
                    throw Error(this.release_asset + ' not found');
                }
            },
            'download release', /* 5*/ async () => {
                if (!data)
                    return;
                const last_updated = fs.existsSync('data/last-updated') ? fs.readFileSync('data/last-updated', 'utf-8') : '';
                this.say(`last updated: ${last_updated}, updated: ${updated}`);
                if (last_updated != updated) {
                    const response = await (0, node_fetch_1.default)(download);
                    if (!response.ok || !response.body)
                        throw new Error(`unexpected response ${response.statusText}`);
                    await streamPipeline(response.body, fs.createWriteStream('./data/last-git-remote-gosh'));
                    fs.writeFileSync('data/last-updated', updated, 'utf-8');
                }
            },
            'chmod binary', /* 6*/ async () => { fs.chmodSync('./data/last-git-remote-gosh', 0o755); },
            'nop', /* 7*/ () => this.nop(),
            'delete repo dir', /* 8*/ () => this.deleteDir(this.repoDir()),
            'link remote', /* 9*/ () => this.execute(['ln', '-s', '-f', 'last-git-remote-gosh', 'data/git-remote-gosh']),
            'clone branch', /*10*/ () => this.execute(['git', 'clone', '-vvv', '--branch', this.branch, '--single-branch',
                `gosh://my-wallet@${this.root}/${this.organization}/${this.repository}`, this.repoDir()]),
        ];
    }
    initialStepsFromRepository(debug) {
        return [
            'ensure gosh dir', /* 0*/ () => this.ensureDir('../.gosh'),
            'template creds', /* 1*/ () => this.copyTemplFile('config/template/credentials.json', '../.gosh/credentials.json', {
                'address': this.address, 'pubkey': this.pubkey, 'secret': this.secret
            }),
            'optdel gosh dir', /* 2*/ () => (fs.existsSync('data/gosh') &&
                (this.get_git_url('data/gosh') !== this.gosh_repo_url)) ?
                this.deleteDir('data/gosh') : this.nop(),
            'optcheckout gosh', /* 3*/ () => (fs.existsSync('data/gosh')) ?
                this.execute(['git', 'checkout', this.gosh_branch], 'data/gosh') : this.nop(),
            'update gosh repo', /* 4*/ () => (fs.existsSync('data/gosh')) ?
                this.execute(['git', 'pull'], 'data/gosh') :
                this.execute(['git', 'clone', '-b', this.gosh_branch, this.gosh_repo_url, 'data/gosh']),
            'npm install', /* 5*/ () => this.execute(['npm', 'install'], 'data/gosh/git-remote-gosh'),
            'ensure temp dir', /* 6*/ () => this.ensureDir('data/temp'),
            'delete repo dir', /* 7*/ () => this.deleteDir(this.repoDir()),
            'request envs', /* 8*/ () => this.requestEnvs(),
            'link remote', /* 9*/ () => this.execute(['ln', '-s', '-f', 'gosh/' + this.gosh_bin_path, 'data/git-remote-gosh']),
            'clone branch', /*10*/ () => this.execute(['git', 'clone', '-vvv', '--branch', this.branch, '--single-branch',
                `gosh://my-wallet@${this.root}/${this.organization}/${this.repository}`, this.repoDir()]),
        ];
    }
}
exports.default = RemoteHandler;
