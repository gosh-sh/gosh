import {now} from "../Utils";
import {MetricsMap} from "../Transformer";
import Handler from "../Handler";

export default class DummyHandler extends Handler {

    override describe(): string {
        return "Dummy";
    }

    override async handle(debug: boolean): Promise<MetricsMap>{
        return new Map<string, number>([
            ["result",    0],
            ["timestamp", now()]
        ]);
    }

}
