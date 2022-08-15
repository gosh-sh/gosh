"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppReadHandler_1 = __importDefault(require("./Handlers/AppReadHandler"));
const AppWriteHandler_1 = __importDefault(require("./Handlers/AppWriteHandler"));
const ExtReadHandler_1 = __importDefault(require("./Handlers/ExtReadHandler"));
const RemoteReadHandler_1 = __importDefault(require("./Handlers/RemoteReadHandler"));
const RemoteWriteHandler_1 = __importDefault(require("./Handlers/RemoteWriteHandler"));
const AppRotateHandler_1 = __importDefault(require("./Handlers/AppRotateHandler"));
function selectHandler(type) {
    switch (type) {
        case 'app-read': return new AppReadHandler_1.default();
        case 'extui-read': return new ExtReadHandler_1.default();
        case 'remote-read': return new RemoteReadHandler_1.default();
        case 'app-write': return new AppWriteHandler_1.default();
        case 'extui-write': throw new TypeError('Not implemented');
        case 'remote-write': return new RemoteWriteHandler_1.default();
        case 'app-rotate': return new AppRotateHandler_1.default();
    }
    throw new TypeError('Invalid type');
}
exports.default = selectHandler;
