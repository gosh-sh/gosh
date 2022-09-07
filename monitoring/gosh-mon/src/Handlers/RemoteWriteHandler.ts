import RemoteHandler from "./RemoteHandler";
import {MetricsMap} from "../PrometheusFormatter";
import * as fs from "fs";
import {nls} from "../Utils";

export default class RemoteWriteHandler extends RemoteHandler {

    describe(): string {
        return `Remote write handler (${this.goshDescribe()})`;
    }

    async handle(debug: boolean): Promise<MetricsMap> {
        let contents = '';
        return await this.doSteps(
            /* 0 - 10*/ ...this.initialSteps(debug),
            /*11*/ () => this.copyFile('config/gitconfig', '../.gitconfig'),
            /*12*/ async() => { fs.writeFileSync(`${this.repoDir()}/${this.filename}`, this.prepareFileContents(), 'utf8'); },
            /*13*/ () => this.execute(['git', 'stage', this.filename], this.repoDir()),
            /*14*/ () => this.execute(['git', 'commit', '-m', `Update ${this.filename} (${nls()})`], this.repoDir()),
            /*15*/ () => this.execute(['git', 'push', '-v'], this.repoDir()),
            /*16*/ async() => { contents = fs.readFileSync(`${this.repoDir()}/${this.filename}`, 'utf8'); },
            /*17*/ () => this.deleteDir(this.repoDir()),
            /*18*/ () => this.processFileContents(contents)
        );
    }



}