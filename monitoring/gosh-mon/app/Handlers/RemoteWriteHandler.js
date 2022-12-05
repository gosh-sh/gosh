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
const RemoteHandler_1 = __importDefault(require("./RemoteHandler"));
const fs = __importStar(require("fs"));
const Utils_1 = require("../Utils");
class RemoteWriteHandler extends RemoteHandler_1.default {
    describe() {
        return `Remote write handler (${this.goshDescribe()})`;
    }
    async handle(debug) {
        let contents = '';
        return await this.doSteps(
        /* 0 - 10*/ ...this.initialSteps(debug), 'copy gitconfig', /*11*/ () => this.copyFile('config/gitconfig', '../.gitconfig'), 'write contents', /*12*/ async () => { fs.writeFileSync(`${this.repoDir()}/${this.filename}`, this.prepareFileContents(), 'utf8'); }, 'git stage', /*13*/ () => this.execute(['git', 'stage', this.filename], this.repoDir()), 'git commit', /*14*/ () => this.execute(['git', 'commit', '-m', `Update ${this.filename} (${(0, Utils_1.niso)()})`], this.repoDir()), 'git push', /*15*/ () => this.execute(['git', 'push', '-' + 'v'.repeat(this.push_verbosity)], this.repoDir()), 'read contents', /*16*/ async () => { contents = fs.readFileSync(`${this.repoDir()}/${this.filename}`, 'utf8'); }, 'delete repo dir', /*17*/ () => this.deleteDir(this.repoDir()), 'check contents', /*18*/ () => this.processFileContents(contents));
    }
}
exports.default = RemoteWriteHandler;
