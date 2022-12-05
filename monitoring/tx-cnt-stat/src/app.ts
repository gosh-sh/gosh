import {TonClient} from "@eversdk/core";
import {libNode} from "@eversdk/lib-node";
import Application from "./Application";
import {env} from "./Utils";

// Initialize TonClient binary library to libNode
TonClient.useBinaryLibrary(libNode);

// Initialize serialization of BigInt
// @ts-ignore Indeed does not exist, creating the function in proto
BigInt.prototype.toJSON = function() { return this.toString() };

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection of promise for reason:', reason);
    // process.exit(1);
});

(new Application(env('SERVICE_NAME', 'tran-count'))).run();
