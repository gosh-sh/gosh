import Service from "./Service";
import TranCountService from "./TranCountService";

export default class Loader {

    load(name: string): Service {
        switch (name) {
            case 'tran-count': return new TranCountService();
            default: throw Error(`Cannot load service ${name}`);
        }
    }

}
