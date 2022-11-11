import ScenarioHandler from "./ScenarioHandler";
import crypto from "crypto";
import fetch from "node-fetch";

export default abstract class GoshHandler extends ScenarioHandler {

    protected seed: string = '';

    protected target: string = '';
    protected organization: string = '';
    protected repository: string = '';
    protected branch: string = '';
    protected filename: string = '';

    protected username: string = '';

    protected large: boolean = false;

    protected appurl: string = 'https://app.gosh.sh/';

    protected root = '';

    protected ipfs_address = '';
    protected prim_network = '';
    protected conf_endpoint = '';

    protected use_envs = '';

    protected async requestEnvs() {
        // require | priority | fallback | disabled
        const eset = this.use_envs;
        if (eset !== 'disabled') {
            try {
                const res = await fetch(this.appurl + '/envs.json');
                const jr = await res.json();
                let gosh = jr.gosh;
                if (gosh && gosh.startsWith('{')) {
                    gosh = JSON.parse(gosh);
                    const gk = Object.keys(gosh);
                    gosh = gosh[gk[gk.length - 1]];
                }
                const p = (eset === 'require') || (eset === 'priority');
                this.ipfs_address = !p ? (this.ipfs_address ?? jr.ipfs) : (jr.ipfs ?? this.ipfs_address);
                this.root = !p ? (this.root ?? gosh) : (gosh ?? this.root);
                this.conf_endpoint = !p ? (this.conf_endpoint ?? jr.network) : (jr.network ?? this.conf_endpoint);
                this.say(`resolved ipfs ${this.ipfs_address}, root ${this.root}, endpoint ${this.conf_endpoint}`);
            } catch (e) {
                if (eset === 'require')
                    throw e;
            }
        }
    }

    applyConfiguration(c: any): GoshHandler {
        super.applyConfiguration(c);
        this.useFields(c,
            ['seed', 'organization', 'repository', 'branch', 'filename', 'large'],
            ['username', 'appurl', 'root', 'ipfs_address', 'prim_network', 'conf_endpoint', 'use_envs'])
        this.target = `${this.organization}/${this.repository}/${this.branch}/${this.filename}`;
        return this;
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