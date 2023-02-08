"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Utils_1 = require("../Utils");
const Handler_1 = __importDefault(require("../Handler"));
class DummyHandler extends Handler_1.default {
    describe() {
        return "Dummy";
    }
    async handle(debug) {
        return new Map([
            ["result", 0],
            ["timestamp", (0, Utils_1.now)()]
        ]);
    }
}
exports.default = DummyHandler;
