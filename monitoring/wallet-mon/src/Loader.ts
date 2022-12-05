import Service from "./Service";
import WalletMonService from "./WalletMonService";

export default class Loader {

    load(name: string): Service {
        switch (name) {
            case 'wallet-mon': return new WalletMonService();
            default: throw Error(`Cannot load service ${name}`);
        }
    }

}
