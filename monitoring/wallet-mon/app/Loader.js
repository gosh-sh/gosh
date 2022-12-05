"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const WalletMonService_1 = __importDefault(require("./WalletMonService"));
class Loader {
    load(name) {
        switch (name) {
            case 'wallet-mon': return new WalletMonService_1.default();
            default: throw Error(`Cannot load service ${name}`);
        }
    }
}
exports.default = Loader;
