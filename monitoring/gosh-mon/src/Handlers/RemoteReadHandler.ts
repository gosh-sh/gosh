import RemoteHandler from "./RemoteHandler";
import {MetricsMap} from "../PrometheusFormatter";
import * as fs from "fs";

export default class RemoteReadHandler extends RemoteHandler {

    describe(): string {
        return `Remote read handler (${this.goshDescribe()})`;
    }

    async handle(debug: boolean): Promise<MetricsMap> {
        let contents = '';
        return await this.doSteps(
            /* 0 - 10*/ ...this.initialSteps(debug),
            'read contents',   /*11*/ async() => { contents = fs.readFileSync(`${this.repoDir()}/${this.filename}`, 'utf8'); },
            'delete repo dir', /*12*/ () => this.deleteDir(this.repoDir()),
            'check contents',  /*13*/ () => this.processFileContents(contents)
        );
    }



}