"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clone = exports.niso = exports.nls = exports.nowms = exports.now = void 0;
const v8_1 = require("v8");
function now() {
    return Math.trunc(Date.now() / 1000);
}
exports.now = now;
function nowms() {
    return Math.trunc(Date.now());
}
exports.nowms = nowms;
function nls() {
    return new Date().toLocaleString();
}
exports.nls = nls;
function niso() {
    return new Date().toISOString();
}
exports.niso = niso;
function clone(obj) {
    return (0, v8_1.deserialize)((0, v8_1.serialize)(obj));
}
exports.clone = clone;
