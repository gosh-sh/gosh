import GoshHandler from "./GoshHandler";
import {StepFunction} from "./ScenarioHandler";

export default abstract class AppHandler extends GoshHandler {

    static readonly indexSteps: number = 2;
    static readonly userSteps: number = 11;
    static readonly branchSteps: number = 14;

    applyExtraConfiguration(c: any) {
        super.applyExtraConfiguration(c);
    }

    protected async removeFooter(): Promise<null> {
        // new footer fa.copy icons interfere with many tests
        await this.page.waitForSelector('footer');
        await this.page.$eval('footer', el => el.remove());
        return null;
    }

    protected initialSteps(debug: boolean, steps?: number): StepFunction[] {
        return [
            /* 0*/ () => this.startBrowser(debug),
            /* 1*/ () => this.openPage(this.appurl),
            () => this.removeFooter(), // not a step, utility function
            /* 2*/ () => this.click("//a[@href='/account/signin']"),
            /* 3*/ () => this.pasteInto("//textarea[@name='phrase']", this.seed),
            /* 4*/ () => this.pasteInto("//input[@name='username']", this.username, 50, true),
            /* 5*/ () => this.click("//button[contains(., 'Sign in') and @type='submit']"),
            () => this.wait(100),
            /* 6*/ () => this.type("//input[@type='password' and @placeholder='PIN code']", "1111"),
            () => this.wait(200),
            /* 7*/ () => this.type("//input[@type='password' and @placeholder='PIN code']", "1111"),
            /* 8*/ () => this.click(`//a[@href='/${this.organization}']`),
            /* 9*/ () => this.click(`//a[@href='/${this.organization}/${this.repository}']`),
            /*10*/ () => this.click(`//a[@href='/${this.organization}/${this.repository}/branches']`),
            /*11*/ () => this.click(`//a[@href='/${this.organization}/${this.repository}/tree/${this.branch}']`),
            /*12*/ () => this.click(`//a[@href='/${this.organization}/${this.repository}/blobs/${this.branch}/${this.filename}' or
                                         @href='/${this.organization}/${this.repository}/blobs/view/${this.branch}/${this.filename}']`),
            () => this.wait(500)
        ].slice(0, steps);
    }

}