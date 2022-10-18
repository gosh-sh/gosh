import RemoteHandler from "./RemoteHandler";
import {MetricsMap} from "../PrometheusFormatter";
import * as fs from "fs";
import {niso, nls} from "../Utils";

export default class RemoteWriteHandler extends RemoteHandler {

    describe(): string {
        return `Remote write handler (${this.goshDescribe()})`;
    }

    async handle(debug: boolean): Promise<MetricsMap> {
        let contents = '';
        return await this.doSteps(
            /* 0 - 10*/ ...this.initialSteps(debug),
            'copy gitconfig',  /*11*/ () => this.copyFile('config/gitconfig', '../.gitconfig'),
            'write contents',  /*12*/ async() => { fs.writeFileSync(`${this.repoDir()}/${this.filename}`, this.prepareFileContents(), 'utf8'); },
            'git stage',       /*13*/ () => this.execute(['git', 'stage', this.filename], this.repoDir()),
            'git commit',      /*14*/ () => this.execute(['git', 'commit', '-m', `Update ${this.filename} (${niso()})`], this.repoDir()),
            'git push',        /*15*/ () => this.execute(['git', 'push', '-' + 'v'.repeat(this.push_verbosity)], this.repoDir()),
            'read contents',   /*16*/ async() => { contents = fs.readFileSync(`${this.repoDir()}/${this.filename}`, 'utf8'); },
            'delete repo dir', /*17*/ () => this.deleteDir(this.repoDir()),
            'check contents',  /*18*/ () => this.processFileContents(contents)
        );
    }



}