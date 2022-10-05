import AppHandler from "./AppHandler";
import {MetricsMap} from "../PrometheusFormatter";

export default class SeedReadHandler extends AppHandler {

    describe(): string {
        return `Seed read handler`;
    }

    async handle(debug: boolean): Promise<MetricsMap> {
        return await this.doSteps(
            /* 0 -  7 */ ...this.initialSteps(debug, AppHandler.userSteps),
            'click settings',    /* 8*/ () => this.click(`//a[@href='/account/settings']`),
            'wait show button',  /* 9*/ () => this.waitFor("//button[contains(., 'Show') and @type='button']"),
            'click show btn 2',  /*10*/ () => this.clickNow("//button[contains(., 'Show') and @type='button']", 1),
            'click copy icon 2', /*11*/ () => this.clickNow("svg.fa-copy", 1),
            'check seed',        /*12*/ () => { return this.checkSeed(); }
        );
    }

    protected async checkSeed(): Promise<number> {
        const obtainedSeed: string = await this.copy();
        if (obtainedSeed === this.seed)
            return 0;
        else
            throw new Error('Returned value does not match expected');
    }

}