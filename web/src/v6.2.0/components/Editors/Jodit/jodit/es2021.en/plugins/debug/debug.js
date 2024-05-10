/*!
 * jodit - Jodit is an awesome and useful wysiwyg editor with filebrowser
 * Author: Chupurnov <chupurnov@gmail.com> (https://xdsoft.net/jodit/)
 * Version: v4.2.14
 * Url: https://xdsoft.net/jodit/
 * License(s): MIT
 */
	
"use strict";
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else {
		var a = factory();
		for(var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];
	}
})(self, function() {
return (self["webpackChunkjodit"] = self["webpackChunkjodit"] || []).push([[486],{

/***/ 40773:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Debug: function() { return /* binding */ Debug; }
/* harmony export */ });
/* harmony import */ var jodit_core_constants__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(17352);
/* harmony import */ var jodit_core_dom_dom__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(55186);
/* harmony import */ var jodit_core_global__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(56298);
/* harmony import */ var jodit_core_helpers_html_strip_tags__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(61793);
/* harmony import */ var jodit_core_plugin_plugin__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(29866);
/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */


// @ts-ignore



class Debug extends jodit_core_plugin_plugin__WEBPACK_IMPORTED_MODULE_4__/* .Plugin */ .k {
    afterInit(jodit) {
        const mirror = jodit.create.div();
        const tree = jodit.create.div();
        const sel = jodit.create.div();
        mirror.appendChild(tree);
        mirror.appendChild(sel);
        jodit.workplace.appendChild(mirror);
        Object.assign(mirror.style, {
            padding: '16px',
            backgroundColor: '#fcfcfc'
        });
        Object.assign(sel.style, {
            paddingTop: '16px'
        });
        jodit.e
            .on('keydown keyup keypress change afterInit updateDebug', () => {
            tree.innerHTML = render(jodit.editor);
        })
            .on(jodit.od, 'selectionchange', () => {
            const range = jodit.selection.range;
            tree.innerHTML = render(jodit.editor);
            sel.innerHTML = `start ${range.startContainer.nodeName} ${range.startOffset}<br>end ${range.endContainer.nodeName} ${range.endOffset}`;
        });
    }
    beforeDestruct(jodit) { }
}
function renderText(elm) {
    if (!elm.nodeValue) {
        return "<span style='color:red'>empty</span>";
    }
    return (0,jodit_core_helpers_html_strip_tags__WEBPACK_IMPORTED_MODULE_3__/* .stripTags */ .K)(elm.nodeValue.replace((0,jodit_core_constants__WEBPACK_IMPORTED_MODULE_0__.INVISIBLE_SPACE_REG_EXP)(), 'INV'));
}
function render(elm, level = 0) {
    return `<div style='padding-left: ${level * 5}px'>
		${elm.nodeName} ${jodit_core_dom_dom__WEBPACK_IMPORTED_MODULE_1__/* .Dom */ .J.isText(elm) ? `- ${renderText(elm)}` : ''}
	${Array.from(elm.childNodes)
        .map(ch => render(ch, level + 1))
        .join('')}
</div>`;
}
// pluginSystem.add('debug', Debug);


/***/ })

},
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ var __webpack_exec__ = function(moduleId) { return __webpack_require__(__webpack_require__.s = moduleId); }
/******/ var __webpack_exports__ = (__webpack_exec__(40773));
/******/ return __webpack_exports__;
/******/ }
]);
});