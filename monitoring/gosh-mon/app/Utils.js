"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nls = exports.nowms = exports.now = void 0;
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
