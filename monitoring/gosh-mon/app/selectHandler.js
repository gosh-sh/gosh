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
const SeedReadHandler_1 = __importDefault(require("./Handlers/SeedReadHandler"));
const RootCheckHandler_1 = __importDefault(require("./Handlers/RootCheckHandler"));
const AppSetupHandler_1 = __importDefault(require("./Handlers/AppSetupHandler"));
const ScriptHandler_1 = __importDefault(require("./Handlers/ScriptHandler"));
const RMonitorHandler_1 = __importDefault(require("./Handlers/RMonitorHandler"));
function selectHandler(type, silent) {
    if (silent !== true)
        console.log('selectHandler, type:', type);
    switch (type) {
        case 'app-read': return new AppReadHandler_1.default();
        case 'extui-read': return new ExtReadHandler_1.default();
        case 'remote-read': return new RemoteReadHandler_1.default();
        case 'app-write': return new AppWriteHandler_1.default();
        case 'extui-write': throw new TypeError('Not implemented');
        case 'remote-write': return new RemoteWriteHandler_1.default();
        case 'app-rotate': return new AppRotateHandler_1.default();
        case 'seed-read': return new SeedReadHandler_1.default();
        case 'root-check': return new RootCheckHandler_1.default();
        case 'app-setup': return new AppSetupHandler_1.default();
        case 'script': return new ScriptHandler_1.default();
        case 'rsmq-monitor': return new RMonitorHandler_1.default();
    }
    throw new TypeError('Invalid type');
}
exports.default = selectHandler;
