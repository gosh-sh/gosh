"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rtrim = exports.ltrim = exports.fill_keys = exports.get = exports.chunked = exports.add_tag = exports.env = exports.camelize_upper = exports.cut_shard = exports.now_ls = exports.now_ms = exports.now = void 0;
function now() {
    return Math.trunc(Date.now() / 1000);
}
exports.now = now;
function now_ms() {
    return Math.trunc(Date.now());
}
exports.now_ms = now_ms;
function now_ls() {
    return new Date().toLocaleString();
}
exports.now_ls = now_ls;
function cut_shard(shard) {
    return shard.replace(/0+$/, "");
}
exports.cut_shard = cut_shard;
function camelize_upper(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
        return word.toUpperCase();
    }).replace(/-+/g, '');
}
exports.camelize_upper = camelize_upper;
function env(key, def) {
    if (process.env[key] !== undefined)
        return process.env[key];
    if (def === undefined)
        throw new Error(`Environment variable ${key} is required`);
    return def;
}
exports.env = env;
function add_tag(m, t) {
    m = m.replace('{}', '');
    return m.includes('{') ? m.replace('{', '{' + t + ',') : `${m}{${t}}`;
}
exports.add_tag = add_tag;
function chunked(arr, chunkSize) {
    if (chunkSize <= 0)
        throw "Invalid chunk size";
    const R = [];
    for (let i = 0, len = arr.length; i < len; i += chunkSize)
        R.push(arr.slice(i, i + chunkSize));
    return R;
}
exports.chunked = chunked;
async function get(client, account, abi, method, input = {}) {
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
            signer: { type: "None" }
        })).message
    })).decoded.output;
}
exports.get = get;
function fill_keys(src, dest, key = 'id') {
    if (!dest)
        dest = {};
    for (let i of src)
        dest[i[key]] = i;
    return dest;
}
exports.fill_keys = fill_keys;
function ltrim(char, str) {
    if (str.slice(0, char.length) === char) {
        return ltrim(char, str.slice(char.length));
    }
    else {
        return str;
    }
}
exports.ltrim = ltrim;
function rtrim(char, str) {
    if (str.slice(str.length - char.length) === char) {
        return rtrim(char, str.slice(0, 0 - char.length));
    }
    else {
        return str;
    }
}
exports.rtrim = rtrim;
