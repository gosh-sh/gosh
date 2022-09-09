import ScenarioHandler from "./ScenarioHandler";
import crypto from "crypto";

export default abstract class GoshHandler extends ScenarioHandler {

    protected seed: string = '';

    protected target: string = '';
    protected organization: string = '';
    protected repository: string = '';
    protected branch: string = '';
    protected filename: string = '';

    protected large: boolean = false;

    setSeed(seed: string) {
        this.seed = seed;
    }

    setTargetParts(organization: string, repository: string, branch: string, filename: string, large?: boolean) {
        this.target = `${organization}/${repository}/${branch}/${filename}`;
        this.organization = organization;
        this.repository = repository;
        this.branch = branch;
        this.filename = filename;
        if (large !== undefined)
            this.setLarge(large);
    }

    setTarget(target: string, large?: boolean) {
        this.target = target;
        [this.organization, this.repository, this.branch, this.filename] = target.split('/');
        if (large !== undefined)
            this.setLarge(large);
    }

    setLarge(large: boolean = true) {
        this.large = large;
    }

    applyExtraConfiguration(c: any) {
        super.applyExtraConfiguration(c);
    }

    protected goshDescribe(): string {
        return this.target + (this.large ? ', IPFS' : '');
    }

    protected async processFileContents(contents?: string): Promise<number> {
        const fileContents: string = contents ?? await this.copy();
        if (this.large) {
            const lines: string[] = fileContents.split('\n').map(v => v.trimEnd());
            const readTail = lines.slice(2).join('');
            if (readTail !== GoshHandler.makeTail(lines[0]))
                throw new TypeError('Data tail is corrupted');
            return Number.parseInt(lines[0]);
        } else {
            return Number.parseInt(fileContents.trim());
        }
    }

    protected prepareFileContents(): string {
        const now_str = (Math.trunc(Date.now() / 1000)).toString();
        return this.large ? (now_str + '\n\n' + GoshHandler.makeTail(now_str, true)) : now_str;
    }

    protected static sha1(data: string) {
        return crypto.createHash("sha1").update(data, "binary").digest("hex");
    }

    protected static makeTail(data: string, blocky: boolean = false): string {
        let h = GoshHandler.sha1(data);
        for (let i=0; i<1111; i++)
            h += GoshHandler.sha1(h);
        const tail: string = Buffer.from(h, 'hex').toString('base64')
            .replaceAll('/','_').replaceAll('+','-').replaceAll('=','');
        return blocky ? tail.match(/.{1,100}/g)!.join('\n') : tail;
    }

}