import * as pako from "pako";
import * as crc32 from "crc-32/crc32";
import * as crc32c from "crc-32/crc32c";
import { default as adler32 } from "adler-32";
import yaml from "js-yaml";
export type PandocParams = {
    text: ArrayBufferLike | string;
    options: {
        [key: string]: unknown;
    } & {
        from: string;
        to: string;
    };
    files?: {
        [key: string]: ArrayBufferLike | string;
    };
    citeproc?: boolean;
};
export declare class Pandoc {
    #private;
    static pako: typeof pako;
    static digest: {
        crc32: typeof crc32;
        crc32c: typeof crc32c;
        adler32: typeof adler32;
    };
    static yaml: typeof yaml;
    wasm: Promise<WebAssembly.Module>;
    dataFiles: {
        [key: string]: ArrayBufferLike;
    };
    constructor();
    init(): Promise<this>;
    run(_params: PandocParams): Promise<string>;
    getVersion(): Promise<string>;
}
export default Pandoc;
