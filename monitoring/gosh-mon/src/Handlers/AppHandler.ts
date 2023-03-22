import GoshHandler from "./GoshHandler";
import {StepEntry} from "./ScenarioHandler";
import {ac_hrefs, or_hrefs} from "../Utils";

export default abstract class AppHandler extends GoshHandler {

    static readonly indexSteps: string = ':indexSteps';
    static readonly userSteps: string = ':userSteps';
    static readonly branchSteps: string = ':branchSteps';

    protected async removeFooter(): Promise<null> {
        // new footer fa.copy icons interfere with many tests
        await this.page.waitForSelector('footer');
        await this.page.$eval('footer', el => el.remove());
        return null;
    }

    protected initialSteps(debug: boolean, label?: string): StepEntry[] {
        const or = this.organization, re = this.repository, br = this.branch, fn = this.filename;
        const steps = [
            'start browser',           () => this.startBrowser(debug),
            'open page',               () => this.openPage(this.appurl),
            AppHandler.indexSteps, //-----------------------------------------------------------------------------------
            // 'remove footer',           () => this.removeFooter(), // not a step, utility function
            'click signin',            () => this.click(`//a[${ac_hrefs('/a/signin')}]`),
            // 'input seed',              () => this.pasteInto("//textarea[@name='phrase']", this.seed, undefined, undefined, true),
            'copy seed to clipboard',  () => this.setClipboard(this.seed),
            'click paste icon',        () => this.click('svg.fa-paste'),
            'clear clipboard',         () => this.setClipboard(''),
            // 'input username',          () => this.pasteInto("//input[@name='username']", this.username, 50, true),
            'click sign in',           () => this.click("//button[contains(., 'Sign in') and @type='submit']"),
            'wait 100ms',              () => this.wait(100),
            'input pin code',          () => this.type("//input[@type='password' and @placeholder='PIN code']", "1111"),
            'wait 200ms',              () => this.wait(200),
            'confirm pin code',        () => this.type("//input[@type='password' and @placeholder='PIN code']", "1111"),
            'wait for spinner gone',   () => this.waitForGone('svg.fa-spinner'),
            'wait 100ms to settle',    () => this.wait(100),
            AppHandler.userSteps, //------------------------------------------------------------------------------------
            'search for organization', () => this.type('//input[@type="search"]', or),
            'click organization',      () => this.click(`//a[${or_hrefs(`/o/${or}`)}]`),
            'wait for spinner gone',   () => this.waitForGone('svg.fa-spinner'),
            'wait 100ms to settle',    () => this.wait(100),
            'search for repository',   () => this.type('//input[@type="search"]', re),
            'click repository',        () => this.click(`//a[${or_hrefs(`/o/${or}/r/${re}`)}]`),
            'click branches',          () => this.click(`//a[${or_hrefs(`/o/${or}/r/${re}/branches`)}]`),
            AppHandler.branchSteps, //----------------------------------------------------------------------------------
            'click branch',            () => this.click(`//a[${or_hrefs(`/o/${or}/r/${re}/tree/${br}`)}]`),
            'click file',              () => this.click(`//a[${or_hrefs(`/o/${or}/r/${re}/blobs/view/${br}/${fn}`)}]`),
            'wait 500ms',              () => this.wait(500)
        ];
        if (label === undefined) return steps;
        const index = steps.indexOf(label);
        if (index === -1) throw new Error(`Label ${label} not found!`);
        return steps.slice(0, index);
    }

}
