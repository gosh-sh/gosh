import AppHandler from "./AppHandler";
import {MetricsMap} from "../PrometheusFormatter";

export default class RootCheckHandler extends AppHandler {

    protected root = '';

    applyExtraConfiguration(c: any) {
        super.applyExtraConfiguration(c);
        this.root = c['root'];
    }

    describe(): string {
        return `Root check handler`;
    }

    async handle(debug: boolean): Promise<MetricsMap> {
        return await this.doSteps(
            /* 0 -  1*/ ...this.initialSteps(debug, AppHandler.indexSteps),
            /* 2*/ () => { return this.checkRoot(); }
        );
    }

    protected async checkRoot(): Promise<number> {
        const page_root = await this.read('footer > div > span');
        const shrt_root = this.root.slice(0, 6) + '...' + this.root.slice(-4);
        if (page_root !== shrt_root)
            throw new Error(`Root mismatch on page: got ${page_root}, expected ${shrt_root}`);
        return 0;
    }

}