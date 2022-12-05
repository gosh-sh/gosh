"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@eversdk/core");
const lib_node_1 = require("@eversdk/lib-node");
const Application_1 = __importDefault(require("./Application"));
const Utils_1 = require("./Utils");
// Initialize TonClient binary library to libNode
core_1.TonClient.useBinaryLibrary(lib_node_1.libNode);
// Initialize serialization of BigInt
// @ts-ignore Indeed does not exist, creating the function in proto
BigInt.prototype.toJSON = function () { return this.toString(); };
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection of promise for reason:', reason);
    // process.exit(1);
});
(new Application_1.default((0, Utils_1.env)('SERVICE_NAME', 'tran-count'))).run();
