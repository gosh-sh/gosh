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
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(31635);
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



var Debug = /** @class */ (function (_super) {
    (0,tslib__WEBPACK_IMPORTED_MODULE_5__/* .__extends */ .C6)(Debug, _super);
    function Debug() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Debug.prototype.afterInit = function (jodit) {
        var mirror = jodit.create.div();
        var tree = jodit.create.div();
        var sel = jodit.create.div();
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
            .on('keydown keyup keypress change afterInit updateDebug', function () {
            tree.innerHTML = render(jodit.editor);
        })
            .on(jodit.od, 'selectionchange', function () {
            var range = jodit.selection.range;
            tree.innerHTML = render(jodit.editor);
            sel.innerHTML = "start ".concat(range.startContainer.nodeName, " ").concat(range.startOffset, "<br>end ").concat(range.endContainer.nodeName, " ").concat(range.endOffset);
        });
    };
    Debug.prototype.beforeDestruct = function (jodit) { };
    return Debug;
}(jodit_core_plugin_plugin__WEBPACK_IMPORTED_MODULE_4__/* .Plugin */ .k));

function renderText(elm) {
    if (!elm.nodeValue) {
        return "<span style='color:red'>empty</span>";
    }
    return (0,jodit_core_helpers_html_strip_tags__WEBPACK_IMPORTED_MODULE_3__/* .stripTags */ .K)(elm.nodeValue.replace((0,jodit_core_constants__WEBPACK_IMPORTED_MODULE_0__.INVISIBLE_SPACE_REG_EXP)(), 'INV'));
}
function render(elm, level) {
    if (level === void 0) { level = 0; }
    return "<div style='padding-left: ".concat(level * 5, "px'>\n\t\t").concat(elm.nodeName, " ").concat(jodit_core_dom_dom__WEBPACK_IMPORTED_MODULE_1__/* .Dom */ .J.isText(elm) ? "- ".concat(renderText(elm)) : '', "\n\t").concat(Array.from(elm.childNodes)
        .map(function (ch) { return render(ch, level + 1); })
        .join(''), "\n</div>");
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