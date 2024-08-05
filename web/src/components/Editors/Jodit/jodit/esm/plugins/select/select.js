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
import { autobind, watch } from "../../core/decorators/index.js";
import { Dom } from "../../core/dom/dom.js";
import { pluginSystem } from "../../core/global.js";
import { camelCase } from "../../core/helpers/string/camel-case.js";
import { Plugin } from "../../core/plugin/index.js";
import { Popup, UIElement } from "../../core/ui/index.js";
import "./config.js";
/**
 * A utility plugin that allows you to subscribe to a click/mousedown/touchstart/mouseup on an element in DOM order
 *
 * @example
 * ```js
 * const editor = Jodit.make('#editor');
 * editor.e.on('clickImg', (img) => {
 *   console.log(img.src);
 * })
 * ```
 */
export class select extends Plugin {
    constructor() {
        super(...arguments);
        this.proxyEventsList = [
            'click',
            'mousedown',
            'touchstart',
            'mouseup',
            'touchend'
        ];
    }
    afterInit(jodit) {
        this.proxyEventsList.forEach(eventName => {
            jodit.e.on(eventName + '.select', this.onStartSelection);
        });
    }
    beforeDestruct(jodit) {
        this.proxyEventsList.forEach(eventName => {
            jodit.e.on(eventName + '.select', this.onStartSelection);
        });
    }
    onStartSelection(e) {
        const { j } = this;
        let result, target = e.target;
        while (result === undefined && target && target !== j.editor) {
            result = j.e.fire(camelCase(e.type + '_' + target.nodeName.toLowerCase()), target, e);
            target = target.parentElement;
        }
        if (e.type === 'click' && result === undefined && target === j.editor) {
            j.e.fire(e.type + 'Editor', target, e);
        }
    }
    /**
     * @event outsideClick(e) - when user clicked on the outside of editor
     */
    onOutsideClick(e) {
        const node = e.target;
        if (Dom.up(node, elm => elm === this.j.editor)) {
            return;
        }
        const box = UIElement.closestElement(node, Popup);
        if (!box) {
            this.j.e.fire('outsideClick', e);
        }
    }
    beforeCommandCut() {
        const { s } = this.j;
        if (!s.isCollapsed()) {
            const current = s.current();
            if (current && Dom.isOrContains(this.j.editor, current)) {
                this.onCopyNormalizeSelectionBound();
            }
        }
    }
    beforeCommandSelectAll() {
        const { s } = this.j;
        s.focus();
        s.select(this.j.editor, true);
        s.expandSelection();
        return false;
    }
    /**
     * Normalize selection after triple click
     */
    onTripleClickNormalizeSelection(e) {
        if (e.detail !== 3 || !this.j.o.select.normalizeTripleClick) {
            return;
        }
        const { s } = this.j;
        const { startContainer, startOffset } = s.range;
        if (startOffset === 0 && Dom.isText(startContainer)) {
            s.select(Dom.closest(startContainer, Dom.isBlock, this.j.editor) ||
                startContainer, true);
        }
    }
    onCopyNormalizeSelectionBound(e) {
        const { s, editor, o } = this.j;
        if (!o.select.normalizeSelectionBeforeCutAndCopy || s.isCollapsed()) {
            return;
        }
        if (e &&
            (!e.isTrusted ||
                !Dom.isNode(e.target) ||
                !Dom.isOrContains(editor, e.target))) {
            return;
        }
        this.jodit.s.expandSelection();
    }
}
__decorate([
    autobind
], select.prototype, "onStartSelection", null);
__decorate([
    watch('ow:click')
], select.prototype, "onOutsideClick", null);
__decorate([
    watch([':beforeCommandCut'])
], select.prototype, "beforeCommandCut", null);
__decorate([
    watch([':beforeCommandSelectall'])
], select.prototype, "beforeCommandSelectAll", null);
__decorate([
    watch([':click'])
], select.prototype, "onTripleClickNormalizeSelection", null);
__decorate([
    watch([':copy', ':cut'])
], select.prototype, "onCopyNormalizeSelectionBound", null);
pluginSystem.add('select', select);
