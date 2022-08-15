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
const node_fetch_1 = __importDefault(require("node-fetch"));
const stream_1 = require("stream");
const streamPipeline = util.promisify(stream_1.pipeline);
class RemoteHandler extends GoshHandler_1.default {
    constructor() {
        super(...arguments);
        this.root = '';
        this.gosh_branch = 'main';
        this.gosh_repo_url = 'https://github.com/tonlabs/gosh.git';
        this.gosh_bin_path = 'git-remote-gosh/git-remote-gosh.js';
        this.release_name = 'latest';
        this.release_asset = '';
    }
    applyExtraConfiguration(c) {
        super.applyExtraConfiguration(c);
        this.root = c['root'];
        this.gosh_branch = c['gosh_branch'] ?? this.gosh_branch;
        this.gosh_repo_url = c['gosh_repo_url'] ?? this.gosh_repo_url;
        this.gosh_bin_path = c['gosh_bin_path'] ?? this.gosh_bin_path;
        this.release_name = c['release_name'] ?? this.release_name;
        this.release_asset = c['release_asset'] ?? this.release_asset;
    }
    async findRoot() {
        if (this.root !== '') // Use one in config IF set in config!
            return;
        // src="/static/js/main.11759a3a.js"
        // text:"gosh://".concat("0:078d7efa815982bb5622065e7658f89b29ce8a24bce90e5ca0906cdfd2cc6358","/")
        this.root = '0:078d7efa815982bb5622065e7658f89b29ce8a24bce90e5ca0906cdfd2cc6358'; // TODO: dynamic fallback
        this.log.push(`${(0, Utils_1.nls)()} [${this.stepsDone}] Root contract resolved to ${this.root}`);
    }
    async copyFile(src, dst) {
        this.say(`${(0, Utils_1.nls)()} [${this.stepsDone}] Copy file ${src} -> ${dst}`);
        await fs.copyFileSync(src, dst);
    }
    async ensureDir(dir) {
        this.say(`${(0, Utils_1.nls)()} [${this.stepsDone}] Ensure dir ${dir}`);
        if (!fs.existsSync(dir))
            await fs.mkdirSync(dir);
    }
    async deleteDir(dir) {
        this.say(`${(0, Utils_1.nls)()} [${this.stepsDone}] Delete dir ${dir}`);
        if (fs.existsSync(dir))
            await exec('rm -rf ' + dir);
    }
    async nop() { }
    async execute(cmdargs, cwd, loud = false) {
        const step = this.stepsDone;
        this.say(`${(0, Utils_1.nls)()} [${step}] Execute [${cmdargs.join(', ')}] in ${cwd ?? '<current>'} dir`, loud);
        const params = (cwd !== undefined) ? { cwd: cwd } : {};
        if (this.started != 0 && this.timeout != 0) {
            params.timeout = Math.max((this.started + this.timeout) - (0, Utils_1.now)(), 1) * 1000;
            params.killSignal = "SIGINT";
        }
        const cmd = cmdargs[0], args = cmdargs.slice(1);
        const process = child_process.spawn(cmd, args, params);
        process.stdout.on('data', (data) => {
            this.say(`${(0, Utils_1.nls)()} [${step}o] ${data}`, loud);
        });
        process.stderr.on('data', (data) => {
            this.say(`${(0, Utils_1.nls)()} [${step}e] ${data}`, loud);
        });
        const prom = new Promise((resolve, reject) => {
            process.on('close', (code) => {
                this.say(`${(0, Utils_1.nls)()} [${step}] Closed all stdio with code ${code}`, loud);
            });
            process.on('exit', (code) => {
                this.say(`${(0, Utils_1.nls)()} [${step}] Exited with code ${code}`, loud);
                if (code == 0)
                    resolve(true);
                else
                    reject('failed with exit code ' + code);
            });
            process.on('error', (err) => {
                this.say(`${(0, Utils_1.nls)()} [${step}] Error occured: ${err}`, loud);
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
        let data = null;
        let updated = '';
        let download = '';
        return this.gosh_branch.startsWith('release:') ?
            [
                /* 0*/ () => this.ensureDir('../.gosh'),
                /* 1*/ () => this.copyFile('config/config.json', '../.gosh/config.json'),
                () => this.nodeWait(this.getRandomInt(1000, 5000)),
                /* 2*/ async () => {
                    // https://github.com/tonlabs/gosh.git
                    const split = this.gosh_repo_url.split('/');
                    const orgrepo = split[3] + '/' + split[4].replace('.git', '');
                    const response = await (0, node_fetch_1.default)(`https://api.github.com/repos/${orgrepo}/releases/${this.release_name}`);
                    if (!response.ok) {
                        if (response.statusText != 'rate limit exceeded')
                            throw new Error(`unexpected response ${response.statusText}`);
                        else {
                            this.say("warning: github rate limit exceeded", true);
                            data = null;
                        }
                    }
                    else
                        data = await response.json();
                },
                /* 3*/ async () => {
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
                /* 4*/ async () => {
                    if (!data)
                        return;
                    const last_updated = fs.existsSync('data/last-updated') ? fs.readFileSync('data/last-updated', 'utf-8') : '';
                    this.say(`${(0, Utils_1.nls)()} last updated: ${last_updated}, updated: ${updated}`);
                    if (last_updated != updated) {
                        const response = await (0, node_fetch_1.default)(download);
                        if (!response.ok || !response.body)
                            throw new Error(`unexpected response ${response.statusText}`);
                        await streamPipeline(response.body, fs.createWriteStream('./data/last-git-remote-gosh'));
                        fs.writeFileSync('data/last-updated', updated, 'utf-8');
                    }
                },
                /* 5*/ async () => { fs.chmodSync('./data/last-git-remote-gosh', 0o755); },
                /* 6*/ () => this.nop(),
                /* 7*/ () => this.deleteDir(this.repoDir()),
                /* 8*/ () => this.findRoot(),
                /* 9*/ () => this.execute(['ln', '-s', '-f', 'last-git-remote-gosh', 'data/git-remote-gosh']),
                /*10*/ () => this.execute(['git', 'clone', '-vv', '--branch', this.branch, '--single-branch',
                    `gosh://my-wallet@${this.root}/${this.organization}/${this.repository}`, this.repoDir()]),
            ]
            :
                [
                    /* 0*/ () => this.ensureDir('../.gosh'),
                    /* 1*/ () => this.copyFile('config/credentials.json', '../.gosh/credentials.json'),
                    /* 2*/ () => (fs.existsSync('data/gosh') &&
                        (this.get_git_url('data/gosh') !== this.gosh_repo_url)) ?
                        this.deleteDir('data/gosh') : this.nop(),
                    /* 3*/ () => (fs.existsSync('data/gosh')) ?
                        this.execute(['git', 'checkout', this.gosh_branch], 'data/gosh') : this.nop(),
                    /* 4*/ () => (fs.existsSync('data/gosh')) ?
                        this.execute(['git', 'pull'], 'data/gosh') :
                        this.execute(['git', 'clone', '-b', this.gosh_branch, this.gosh_repo_url, 'data/gosh']),
                    /* 5*/ () => this.execute(['npm', 'install'], 'data/gosh/git-remote-gosh'),
                    /* 6*/ () => this.ensureDir('data/temp'),
                    /* 7*/ () => this.deleteDir(this.repoDir()),
                    /* 8*/ () => this.findRoot(),
                    /* 9*/ () => this.execute(['ln', '-s', '-f', 'gosh/' + this.gosh_bin_path, 'data/git-remote-gosh']),
                    /*10*/ () => this.execute(['git', 'clone', '-v', '--branch', this.branch, '--single-branch',
                        `gosh://my-wallet@${this.root}/${this.organization}/${this.repository}`, this.repoDir()]),
                ];
    }
}
exports.default = RemoteHandler;
