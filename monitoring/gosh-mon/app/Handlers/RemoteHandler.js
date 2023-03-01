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
        this.release_tared = '';
        this.tar_sel_file = '';
        this.github_user = '';
        this.github_token = '';
        this.address = '';
        this.pubkey = '';
        this.secret = '';
        this.pull_verbosity = 1;
        this.push_verbosity = 1;
    }
    applyConfiguration(c) {
        super.applyConfiguration(c);
        this.useFields(c, ['gosh_branch', 'gosh_repo_url', 'pubkey', 'secret'], ['gosh_bin_path', 'release_asset', 'release_tared', 'tar_sel_file', 'github_user', 'github_token', 'address',
            'push_verbosity', 'pull_verbosity']);
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
        if (this.started != 0 && this.timeout_ms != 0) {
            params.timeout = Math.max((this.started + this.timeout_ms) - (0, Utils_1.now)(), 1) * 1000;
            params.killSignal = "SIGINT";
        }
        params.env = Object.assign({}, { 'RUST_BACKTRACE': 'full' }, process.env);
        const cmd = cmdargs[0], args = cmdargs.slice(1);
        const proc = child_process.spawn(cmd, args, params);
        const skiprx = /^\s*(\d+)?,?$/;
        proc.stdout.on('data', (data) => {
            this.say(`[${step}o] ${data}`, loud);
        });
        proc.stderr.on('data', (data) => {
            if (data.toString().split('\n').every((s) => skiprx.test(s)))
                return; // skip
            this.say(`[${step}e] ${data}`, loud);
        });
        const prom = new Promise((resolve, reject) => {
            proc.on('close', (code) => {
                this.say(`[${step}] Closed all stdio with code ${code}`, loud);
            });
            proc.on('exit', (code) => {
                this.say(`[${step}] Exited with code ${code}`, loud);
                if (code == 0)
                    resolve(true);
                else
                    reject('failed with exit code ' + code);
            });
            proc.on('error', (err) => {
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
        let tared = false;
        return [
            'ensure .gosh dir', /* 0*/ () => this.ensureDir('../.gosh'),
            'request envs', /* 1*/ () => this.requestEnvs(),
            'config template', /* 2*/ () => this.copyTemplFile('config/template/config.json', '../.gosh/config.json', {
                'pubkey': this.pubkey, 'secret': this.secret, 'ipfs_address': this.ipfs_address, 'profile': this.username,
                'prim_network': this.prim_network, 'conf_endpoint': this.conf_endpoint.replaceAll(',', '", "'),
            }),
            'random wait', () => this.nodeWait(process.env.ONESHOT_DEBUG === undefined ? this.getRandomInt(1000, 10000) : 1),
            'query release', /* 3*/ async () => {
                // https://github.com/<organization>/<repository>.git
                const split = this.gosh_repo_url.split('/');
                const orgrepo = split[3] + '/' + split[4].replace('.git', '');
                const release_name = this.gosh_branch.replace('release:', '');
                const url = (release_name === 'latest-prerelease' || release_name === 'latest') ?
                    `https://api.github.com/repos/${orgrepo}/releases` :
                    `https://api.github.com/repos/${orgrepo}/releases/${release_name}`;
                // change -vX to invalidate current tag if something in algorithm noticeably changes and cache may cause problems
                const tag_fn = 'data/last-tag-v3';
                const etag_fn = 'data/last-etag-v3';
                const etag = fs.existsSync(etag_fn) ? fs.readFileSync(etag_fn, 'utf-8') : '';
                const headers = new node_fetch_1.Headers();
                if (this.github_user !== '' && this.github_token !== '')
                    headers.set('Authorization', 'Basic ' + Buffer.from(`${this.github_user}:${this.github_token}`).toString('base64'));
                if (etag !== '' && fs.existsSync('./data/last-git-remote-gosh') && fs.existsSync('data/last-updated') && fs.existsSync(tag_fn))
                    headers.set('If-None-Match', etag);
                const response = await (0, node_fetch_1.default)(url, { headers: headers });
                if (!response.ok) {
                    if (response.statusText === 'Not Modified') {
                        this.say("github conditional result: not modified", true);
                        if (fs.existsSync(tag_fn))
                            this.say('using cached release from tag ' + fs.readFileSync(tag_fn, 'utf-8'));
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
                    const what = release_name === 'latest' ? 'release' : '(pre)release';
                    if (release_name === 'latest-prerelease' || release_name === 'latest') {
                        const cond = release_name === 'latest' ? (x) => !x.prerelease : (x) => true;
                        for (let r of data) {
                            if (!cond(r))
                                continue;
                            let found = false;
                            for (let a of r['assets']) {
                                if (a['name'] == this.release_asset || a['name'] == this.release_tared) {
                                    found = true;
                                    break;
                                }
                            }
                            if (!found) {
                                this.say(`warning: ${r['name']} does not contain ${this.release_asset} and ${this.release_tared}, skipping!`);
                                continue;
                            }
                            this.say(`selected first (latest) ${what} ${r.name}`);
                            sel = r;
                            break;
                        }
                    }
                    else
                        sel = data;
                    if (!sel)
                        throw new Error(`${what} not found`);
                    else
                        data = sel;
                    for (let [k, v] of response.headers) {
                        if (k === 'etag') {
                            fs.writeFileSync(etag_fn, v, 'utf-8');
                            break;
                        }
                    }
                    fs.writeFileSync(tag_fn, data['tag_name'], 'utf-8');
                    this.say('getting release with tag: ' + data['tag_name']);
                }
            },
            'find release', /* 4*/ async () => {
                if (!data)
                    return;
                let found = false;
                for (let a of data['assets']) {
                    if (a['name'] == this.release_asset || a['name'] == this.release_tared) {
                        found = true;
                        tared = a['name'] == this.release_tared;
                        updated = a['updated_at'];
                        download = a['browser_download_url'];
                        break;
                    }
                }
                if (!found) {
                    throw Error(this.release_asset + ' and ' + this.release_tared + ' not found');
                }
            },
            'download release', /* 5*/ async () => {
                if (!data)
                    return;
                const last_updated = fs.existsSync('data/last-updated') ? fs.readFileSync('data/last-updated', 'utf-8') : '';
                this.say(`last updated: ${last_updated}, updated: ${updated}`);
                if (last_updated != updated) {
                    const response = await (0, node_fetch_1.default)(download);
                    const dlpath = tared ? './untar/archive.tar' : './data/last-git-remote-gosh';
                    if (tared && !fs.existsSync('untar'))
                        fs.mkdirSync('untar');
                    if (!response.ok || !response.body)
                        throw new Error(`unexpected response ${response.statusText}`);
                    await streamPipeline(response.body, fs.createWriteStream(dlpath));
                    if (tared) {
                        await this.execute(['tar', 'xf', 'archive.tar'], 'untar');
                        if (!fs.existsSync('./untar/' + this.tar_sel_file)) {
                            throw Error(`File ${this.tar_sel_file} not found in archive`);
                        }
                        fs.cpSync('./untar/' + this.tar_sel_file, './data/last-git-remote-gosh');
                    }
                    fs.writeFileSync('data/last-updated', updated, 'utf-8');
                }
            },
            'chmod binary', /* 6*/ async () => { fs.chmodSync('./data/last-git-remote-gosh', 0o755); },
            'nop', /* 7*/ () => this.nop(),
            'delete repo dir', /* 8*/ () => this.deleteDir(this.repoDir()),
            'link remote', /* 9*/ () => this.execute(['ln', '-s', '-f', 'last-git-remote-gosh', 'data/git-remote-gosh']),
            'clone branch', /*10*/ () => this.execute(['git', 'clone', '-' + 'v'.repeat(this.pull_verbosity), '--branch', this.branch, '--single-branch',
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
            'clone branch', /*10*/ () => this.execute(['git', 'clone', '-' + 'v'.repeat(this.pull_verbosity), '--branch', this.branch, '--single-branch',
                `gosh://my-wallet@${this.root}/${this.organization}/${this.repository}`, this.repoDir()]),
        ];
    }
}
exports.default = RemoteHandler;
