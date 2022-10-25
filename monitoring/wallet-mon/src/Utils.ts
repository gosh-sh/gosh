import {Abi, TonClient} from "@eversdk/core";
import Dict = NodeJS.Dict;

export function now(): number {
    return Math.trunc(Date.now() / 1000);
}

export function now_ms(): number {
    return Math.trunc(Date.now());
}

export function now_ls(): string {
    return new Date().toLocaleString();
}

export function cut_shard(shard: string) {
    return shard.replace(/0+$/, "");
}

export function camelize_upper(str: string) {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(word, index) {
        return word.toUpperCase(); }).replace(/-+/g, '');
}

export function env(key: string, def?: string): string {
    if (process.env[key] !== undefined)
        return process.env[key]!;
    if (def === undefined)
        throw new Error(`Environment variable ${key} is required`);
    return def;
}

export function add_tag(m: string, t: string): string {
    m = m.replace('{}', '');
    return m.includes('{') ? m.replace('{', '{' + t + ',') : `${m}{${t}}`;
}

export function chunked(arr: any[], chunkSize: number) {
    if (chunkSize <= 0) throw "Invalid chunk size";
    const R = [];
    for (let i=0,len=arr.length; i<len; i+=chunkSize)
        R.push(arr.slice(i,i+chunkSize));
    return R;
}

export async function get(client: TonClient, account: any, abi: Abi, method: string, input: any = {}) {
    return (await client.tvm.run_tvm({
        account: account.boc,
        abi: abi,
        message: (await client.abi.encode_message({
            abi: abi,
            address: account.id,
            call_set: {
                function_name: method,
                input: input
            },
            signer: {type: "None"}
        })).message
    })).decoded!.output;
}

export function fill_keys(src: any[], dest?: Dict<any>, key: string = 'id') {
    if (!dest) dest = {};
    for (let i of src) dest[i[key]] = i;
    return dest;
}

export function ltrim(char: string, str: string): string {
    if (str.slice(0, char.length) === char) {
        return ltrim(char, str.slice(char.length));
    } else {
        return str;
    }
}

export function rtrim(char: string, str: string): string {
    if (str.slice(str.length - char.length) === char) {
        return rtrim(char, str.slice(0, 0 - char.length));
    } else {
        return str;
    }
}