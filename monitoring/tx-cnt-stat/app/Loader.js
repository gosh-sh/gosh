"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const TranCountService_1 = __importDefault(require("./TranCountService"));
class Loader {
    load(name) {
        switch (name) {
            case 'tran-count': return new TranCountService_1.default();
            default: throw Error(`Cannot load service ${name}`);
        }
    }
}
exports.default = Loader;
