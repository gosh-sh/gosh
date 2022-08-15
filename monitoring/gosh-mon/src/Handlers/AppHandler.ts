import GoshHandler from "./GoshHandler";
import {StepFunction} from "./ScenarioHandler";

export default abstract class AppHandler extends GoshHandler {

    static readonly branchSteps: number = 12;

    protected appurl: string = 'https://app.gosh.sh/';

    applyExtraConfiguration(c: any) {
        super.applyExtraConfiguration(c);
        if (c['appurl'])
            this.appurl = c['appurl'];
    }

    protected initialSteps(debug: boolean, steps?: number): StepFunction[] {
        return [
            /* 0*/ () => this.startBrowser(debug),
            /* 1*/ () => this.openPage(this.appurl),
            /* 2*/ () => this.click("//a[@href='/account/signin']"),
            /* 3*/ () => this.pasteInto("//textarea[@name='phrase']", this.seed),
            /* 4*/ () => this.click("//button[contains(., 'Sign in') and @type='submit']"),
            () => this.wait(100),
            /* 5*/ () => this.type("//input[@type='password' and @placeholder='PIN code']", "1111"),
            () => this.wait(200),
            /* 6*/ () => this.type("//input[@type='password' and @placeholder='PIN code']", "1111"),
            /* 7*/ () => this.click(`//a[@href='/${this.organization}']`),
            /* 8*/ () => this.click(`//a[@href='/${this.organization}/${this.repository}']`),
            /* 9*/ () => this.click(`//a[@href='/${this.organization}/${this.repository}/branches']`),
            /*10*/ () => this.click(`//a[@href='/${this.organization}/${this.repository}/tree/${this.branch}']`),
            /*11*/ () => this.click(`//a[@href='/${this.organization}/${this.repository}/blobs/${this.branch}/${this.filename}']`),
            () => this.wait(500)
        ].slice(0, steps);
    }

}