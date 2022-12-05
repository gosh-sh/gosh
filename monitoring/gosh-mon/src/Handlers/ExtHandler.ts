import GoshHandler from "./GoshHandler";
import {StepEntry} from "./ScenarioHandler";

export default abstract class ExtHandler extends GoshHandler {

    protected initialSteps(debug: boolean, clickFile: boolean = true): StepEntry[] {
        const base = 'https://extension-ui.gosh.sh/#';
        return [
            /* 0*/ () => this.startBrowser(debug),
            /* 1*/ () => this.openPage(base),
            /* 2*/ () => this.click("//button[contains(., 'Sign In') and contains(@class, 'button-cta-pale')]"),
            /* 3*/ () => this.pasteInto("//textarea[contains(@class, 'seedphrase-textarea')]", this.seed),
            /* 4*/ () => this.click("//button[contains(., 'Next') and contains(@class, 'MuiButton-contained')]"),
            () => this.wait(100),
            /* 5*/ () => this.type("//input[@type='text' and @placeholder='' and @maxlength=4 and contains(@class, 'MuiInputBase-input')]", "1111"),
            () => this.wait(200),
            /* 6*/ () => this.type("//input[@type='text' and @placeholder='' and @maxlength=4 and contains(@class, 'MuiInputBase-input')]", "1111"),
            /* 7*/ () => this.click(`//a[@href='${base}/organizations/${this.organization}']`),
            /* 8*/ () => this.click(`//a[@href='${base}/organizations/${this.organization}/repositories/${this.repository}']`),
            /* 9*/ () => this.click(`//a[@href='${base}/organizations/${this.organization}/repositories/${this.repository}/branches']`),
            /*10*/ () => this.click(`//a[@href='${base}/organizations/${this.organization}/repositories/${this.repository}/tree/${this.branch}']`),
            clickFile ?
                /*11*/ () => this.click(`//a[@href='${base}/organizations/${this.organization}/repositories/${this.repository}/blobs/${this.branch}/${this.filename}']`)
                     : () => this.wait(1),
            () => this.wait(500)
        ];
    }

}