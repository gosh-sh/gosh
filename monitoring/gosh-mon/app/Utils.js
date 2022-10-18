"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.iftrue = exports.ifdef = exports.limstr = exports.ac_hrefs = exports.or_hrefs = exports.hrefs = exports.clone = exports.niso = exports.nls = exports.nowms = exports.now = void 0;
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
function hrefs(...urls) {
    return urls.map((s) => `@href='${s}'`).join(' or ');
}
exports.hrefs = hrefs;
function or_hrefs(url) {
    const parts = url.split('/');
    //  /o/${or}/r/${re}/blobs/view/${br}/${fn}
    // 0 1 2     3 4     5     6    7     8
    if (parts[3] === 'r')
        parts.splice(3, 1);
    if (parts[1] === 'o')
        parts.splice(1, 1);
    return hrefs(url, parts.join('/'));
}
exports.or_hrefs = or_hrefs;
function ac_hrefs(url) {
    return hrefs(url, url.replaceAll('/a/', '/account/'));
}
exports.ac_hrefs = ac_hrefs;
function limstr(s, l) {
    return s.length <= l ? s : (s.substring(0, l) + '...');
}
exports.limstr = limstr;
function ifdef(pref, val) {
    return val !== undefined ? `${pref}${val}` : '';
}
exports.ifdef = ifdef;
function iftrue(text, cond) {
    return cond === true ? text : '';
}
exports.iftrue = iftrue;
