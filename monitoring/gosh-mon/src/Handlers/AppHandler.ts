import GoshHandler from "./GoshHandler";
import {StepEntry} from "./ScenarioHandler";

export default abstract class AppHandler extends GoshHandler {

    static readonly indexSteps: number = 4;
    static readonly userSteps: number = 22;
    static readonly branchSteps: number = 28;

    protected async removeFooter(): Promise<null> {
        // new footer fa.copy icons interfere with many tests
        await this.page.waitForSelector('footer');
        await this.page.$eval('footer', el => el.remove());
        return null;
    }

    protected initialSteps(debug: boolean, steps?: number): StepEntry[] {
        return [
            'start browser',      /* 0*/ () => this.startBrowser(debug),
            'open page',          /* 1*/ () => this.openPage(this.appurl),
            'remove footer',             () => this.removeFooter(), // not a step, utility function
            'click signin',       /* 2*/ () => this.click("//a[@href='/account/signin']"),
            'input seed',         /* 3*/ () => this.pasteInto("//textarea[@name='phrase']", this.seed),
            'input username',     /* 4*/ () => this.pasteInto("//input[@name='username']", this.username, 50, true),
            'click sign in',      /* 5*/ () => this.click("//button[contains(., 'Sign in') and @type='submit']"),
            'wait 100ms',                () => this.wait(100),
            'input pin code',     /* 6*/ () => this.type("//input[@type='password' and @placeholder='PIN code']", "1111"),
            'wait 200ms',                () => this.wait(200),
            'confirm pin code',   /* 7*/ () => this.type("//input[@type='password' and @placeholder='PIN code']", "1111"),
            'click organization', /* 8*/ () => this.click(`//a[@href='/${this.organization}']`),
            'click repository',   /* 9*/ () => this.click(`//a[@href='/${this.organization}/${this.repository}']`),
            'click branches',     /*10*/ () => this.click(`//a[@href='/${this.organization}/${this.repository}/branches']`),
            'click branch',       /*11*/ () => this.click(`//a[@href='/${this.organization}/${this.repository}/tree/${this.branch}']`),
            'click file',         /*12*/ () => this.click(`//a[@href='/${this.organization}/${this.repository}/blobs/${this.branch}/${this.filename}' or
                                                               @href='/${this.organization}/${this.repository}/blobs/view/${this.branch}/${this.filename}']`),
            'wait 500ms',                () => this.wait(500)
        ].slice(0, steps);
    }

}