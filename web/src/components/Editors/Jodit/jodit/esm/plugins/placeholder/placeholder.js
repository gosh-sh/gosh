/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
        r = Reflect.decorate(decorators, target, key, desc);
    else
        for (var i = decorators.length - 1; i >= 0; i--)
            if (d = decorators[i])
                r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import * as consts from "../../core/constants.js";
import { INSEPARABLE_TAGS } from "../../core/constants.js";
import { debounce } from "../../core/decorators/index.js";
import { Dom } from "../../core/dom/dom.js";
import { pluginSystem } from "../../core/global.js";
import { isMarker } from "../../core/helpers/checker/is-marker.js";
import { attr } from "../../core/helpers/utils/attr.js";
import { css } from "../../core/helpers/utils/css.js";
import { Plugin } from "../../core/plugin/plugin.js";
import "./config.js";
/**
 * Check if root node is empty
 * @private
 */
export function isEditorEmpty(root) {
    if (!root.firstChild) {
        return true;
    }
    const first = root.firstChild;
    if (INSEPARABLE_TAGS.has(first.nodeName?.toLowerCase()) ||
        /^(TABLE)$/i.test(first.nodeName)) {
        return false;
    }
    const next = Dom.next(first, node => node && !Dom.isEmptyTextNode(node), root);
    if (Dom.isText(first) && !next) {
        return Dom.isEmptyTextNode(first);
    }
    return (!next &&
        Dom.each(first, elm => !(Dom.isLeaf(elm) || Dom.isList(elm)) &&
            (Dom.isEmpty(elm) || Dom.isTag(elm, 'br'))));
}
/**
 * Show placeholder inside empty editor
 */
export class placeholder extends Plugin {
    constructor() {
        super(...arguments);
        this.addNativeListeners = () => {
            this.j.e
                .off(this.j.editor, 'input.placeholder keydown.placeholder')
                .on(this.j.editor, 'input.placeholder keydown.placeholder', this.toggle);
        };
        this.addEvents = () => {
            const editor = this.j;
            if (editor.o.useInputsPlaceholder &&
                editor.element.hasAttribute('placeholder')) {
                this.placeholderElm.innerHTML =
                    attr(editor.element, 'placeholder') || '';
            }
            editor.e.fire('placeholder', this.placeholderElm.innerHTML);
            editor.e
                .off('.placeholder')
                .on('changePlace.placeholder', this.addNativeListeners)
                .on('change.placeholder focus.placeholder keyup.placeholder mouseup.placeholder keydown.placeholder ' +
                'mousedown.placeholder afterSetMode.placeholder changePlace.placeholder', this.toggle)
                .on(window, 'load', this.toggle);
            this.addNativeListeners();
            this.toggle();
        };
    }
    afterInit(editor) {
        if (!editor.o.showPlaceholder) {
            return;
        }
        this.placeholderElm = editor.c.fromHTML(`<span data-ref="placeholder" style="display: none;" class="jodit-placeholder">${editor.i18n(editor.o.placeholder)}</span>`);
        if (editor.o.direction === 'rtl') {
            this.placeholderElm.style.right = '0px';
            this.placeholderElm.style.direction = 'rtl';
        }
        editor.e
            .on('readonly', (isReadOnly) => {
            if (isReadOnly) {
                this.hide();
            }
            else {
                this.toggle();
            }
        })
            .on('changePlace', this.addEvents);
        this.addEvents();
    }
    show() {
        const editor = this.j;
        if (editor.o.readonly) {
            return;
        }
        let marginTop = 0, marginLeft = 0;
        const current = editor.s.current(), wrapper = (current && Dom.closest(current, Dom.isBlock, editor.editor)) ||
            editor.editor;
        const style = editor.ew.getComputedStyle(wrapper);
        const styleEditor = editor.ew.getComputedStyle(editor.editor);
        editor.workplace.appendChild(this.placeholderElm);
        const { firstChild } = editor.editor;
        if (Dom.isElement(firstChild) && !isMarker(firstChild)) {
            const style2 = editor.ew.getComputedStyle(firstChild);
            marginTop = parseInt(style2.getPropertyValue('margin-top'), 10);
            marginLeft = parseInt(style2.getPropertyValue('margin-left'), 10);
            this.placeholderElm.style.fontSize =
                parseInt(style2.getPropertyValue('font-size'), 10) + 'px';
            this.placeholderElm.style.lineHeight =
                style2.getPropertyValue('line-height');
        }
        else {
            this.placeholderElm.style.fontSize =
                parseInt(style.getPropertyValue('font-size'), 10) + 'px';
            this.placeholderElm.style.lineHeight =
                style.getPropertyValue('line-height');
        }
        css(this.placeholderElm, {
            display: 'block',
            textAlign: style.getPropertyValue('text-align'),
            paddingTop: parseInt(styleEditor.paddingTop, 10) + 'px',
            paddingLeft: parseInt(styleEditor.paddingLeft, 10) + 'px',
            paddingRight: parseInt(styleEditor.paddingRight, 10) + 'px',
            marginTop: Math.max(parseInt(style.getPropertyValue('margin-top'), 10), marginTop),
            marginLeft: Math.max(parseInt(style.getPropertyValue('margin-left'), 10), marginLeft)
        });
    }
    hide() {
        Dom.safeRemove(this.placeholderElm);
    }
    toggle() {
        const editor = this.j;
        if (!editor.editor || editor.isInDestruct) {
            return;
        }
        if (editor.getRealMode() !== consts.MODE_WYSIWYG) {
            this.hide();
            return;
        }
        if (!isEditorEmpty(editor.editor)) {
            this.hide();
        }
        else {
            this.show();
        }
    }
    beforeDestruct(jodit) {
        this.hide();
        jodit.e.off('.placeholder').off(window, 'load', this.toggle);
    }
}
__decorate([
    debounce(ctx => ctx.defaultTimeout / 10, true)
], placeholder.prototype, "toggle", null);
pluginSystem.add('placeholder', placeholder);
