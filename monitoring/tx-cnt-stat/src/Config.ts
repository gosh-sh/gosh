import yaml from "js-yaml";
import fs from "fs";
import Dict = NodeJS.Dict;

export default class Config {

    private read: Dict<boolean> = {};
    private incl: Array<string> = [];

    configPath = (name: string): string => `./config/${name}.yml`;

    loadConfig(name: string): any {
        let conf: any = {};
        this.incl.push(name);
        let end: boolean = false;
        while (!end) {
            end = true;
            for (let k of this.incl) {
                if (this.read[k])
                    continue;
                conf = Object.assign({}, this.loadFile(k), conf);
                this.read[k] = true;
                if (conf['include'])
                    for (let i of conf['include']) {
                        if (!this.incl.includes(i))
                            this.incl.push(i);
                    }
            }
        }
        return conf;
    }

    private loadFile(name: string): any {
        const path = this.configPath(name);
        let conf: any = {};
        try {
            conf = yaml.load(fs.readFileSync(path, 'utf-8'));
            console.log(`Loaded configuration from ${name}`);
        }
        catch (e) {
            console.error(`Failed to load configuration ${name} from ${path}`, e);
            throw e;
        }
        return conf;
    }

}