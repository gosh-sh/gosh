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
import { autobind, cache, debounce, wait, watch } from "../../core/decorators/index.js";
import { Dom } from "../../core/dom/index.js";
import { pluginSystem } from "../../core/global.js";
import { camelCase, isArray, isFunction, isString, keys, position, splitArray, toArray } from "../../core/helpers/index.js";
import { Plugin } from "../../core/plugin/index.js";
import { UIElement } from "../../core/ui/index.js";
import { Popup } from "../../core/ui/popup/index.js";
import { makeCollection } from "../../modules/toolbar/factory.js";
import "./config/config.js";
/**
 * Plugin for show inline popup dialog
 */
export class inlinePopup extends Plugin {
    constructor() {
        super(...arguments);
        this.type = null;
        this.snapRange = null;
        this.elmsList = keys(this.j.o.popup, false).filter(s => !this.isExcludedTarget(s));
    }
    get popup() {
        return new Popup(this.jodit, false);
    }
    get toolbar() {
        return makeCollection(this.jodit, this.popup);
    }
    onClick(node) {
        const elements = this.elmsList, target = Dom.isTag(node, 'img')
            ? node
            : Dom.closest(node, elements, this.j.editor);
        if (target && this.canShowPopupForType(target.nodeName.toLowerCase())) {
            this.showPopup(() => position(target, this.j), target.nodeName.toLowerCase(), target);
            return false;
        }
    }
    /**
     * Show inline popup with some toolbar
     *
     * @param type - selection, img, a etc.
     */
    showPopup(rect, type, target) {
        type = type.toLowerCase();
        if (!this.canShowPopupForType(type)) {
            return false;
        }
        if (this.type !== type || target !== this.previousTarget) {
            this.previousTarget = target;
            const data = this.j.o.popup[type];
            let content;
            if (isFunction(data)) {
                content = data(this.j, target, this.popup.close);
            }
            else {
                content = data;
            }
            if (isArray(content)) {
                this.toolbar.build(content, target);
                this.toolbar.buttonSize = this.j.o.toolbarButtonSize;
                content = this.toolbar.container;
            }
            this.popup.setContent(content);
            this.type = type;
        }
        this.popup.open(rect);
        return true;
    }
    /**
     * Hide opened popup
     */
    hidePopup(type) {
        if (this.popup.isOpened && (!isString(type) || type === this.type)) {
            this.popup.close();
        }
    }
    onOutsideClick() {
        this.popup.close();
    }
    /**
     * Can show popup for this type
     */
    canShowPopupForType(type) {
        const data = this.j.o.popup[type.toLowerCase()];
        if (this.j.o.readonly || !this.j.o.toolbarInline || !data) {
            return false;
        }
        return !this.isExcludedTarget(type);
    }
    /**
     * For some elements do not show popup
     */
    isExcludedTarget(type) {
        return splitArray(this.j.o.toolbarInlineDisableFor)
            .map(a => a.toLowerCase())
            .includes(type.toLowerCase());
    }
    /** @override **/
    afterInit(jodit) {
        this.j.e
            .on('getDiffButtons.mobile', (toolbar) => {
            if (this.toolbar === toolbar) {
                const names = this.toolbar.getButtonsNames();
                return toArray(jodit.registeredButtons)
                    .filter(btn => !this.j.o.toolbarInlineDisabledButtons.includes(btn.name))
                    .filter(item => {
                    const name = isString(item) ? item : item.name;
                    return (name &&
                        name !== '|' &&
                        name !== '\n' &&
                        !names.includes(name));
                });
            }
        })
            .on('hidePopup', this.hidePopup)
            .on('showInlineToolbar', this.showInlineToolbar)
            .on('showPopup', (elm, rect, type) => {
            this.showPopup(rect, type || (isString(elm) ? elm : elm.nodeName), isString(elm) ? undefined : elm);
        })
            .on('mousedown keydown', this.onSelectionStart)
            .on('change', () => {
            if (this.popup.isOpened &&
                this.previousTarget &&
                !this.previousTarget.parentNode) {
                this.hidePopup();
                this.previousTarget = undefined;
            }
        })
            .on([this.j.ew, this.j.ow], 'mouseup keyup', this.onSelectionEnd);
        this.addListenersForElements();
    }
    onSelectionStart() {
        this.snapRange = this.j.s.range.cloneRange();
    }
    onSelectionEnd(e) {
        if (e &&
            e.target &&
            UIElement.closestElement(e.target, Popup)) {
            return;
        }
        const { snapRange } = this, { range } = this.j.s;
        if (!snapRange ||
            range.collapsed ||
            range.startContainer !== snapRange.startContainer ||
            range.startOffset !== snapRange.startOffset ||
            range.endContainer !== snapRange.endContainer ||
            range.endOffset !== snapRange.endOffset) {
            this.onSelectionChange();
        }
    }
    /**
     * Selection change handler
     */
    onSelectionChange() {
        if (!this.j.o.toolbarInlineForSelection) {
            return;
        }
        const type = 'selection', sel = this.j.s.sel, range = this.j.s.range;
        if (sel?.isCollapsed ||
            this.isSelectedTarget(range) ||
            this.tableModule.getAllSelectedCells().length) {
            if (this.type === type && this.popup.isOpened) {
                this.hidePopup();
            }
            return;
        }
        const node = this.j.s.current();
        if (!node) {
            return;
        }
        this.showPopup(() => range.getBoundingClientRect(), type);
    }
    /**
     * In not collapsed selection - only one image
     */
    isSelectedTarget(r) {
        const sc = r.startContainer;
        return (Dom.isElement(sc) &&
            sc === r.endContainer &&
            Dom.isTag(sc.childNodes[r.startOffset], new Set(keys(this.j.o.popup, false))) &&
            r.startOffset === r.endOffset - 1);
    }
    /**
     * Shortcut for Table module
     */
    get tableModule() {
        return this.j.getInstance('Table', this.j.o);
    }
    /** @override **/
    beforeDestruct(jodit) {
        jodit.e
            .off('showPopup')
            .off([this.j.ew, this.j.ow], 'mouseup keyup', this.onSelectionEnd);
        this.removeListenersForElements();
    }
    _eventsList() {
        const el = this.elmsList;
        return el
            .map(e => camelCase(`click_${e}`))
            .concat(el.map(e => camelCase(`touchstart_${e}`)))
            .join(' ');
    }
    addListenersForElements() {
        this.j.e.on(this._eventsList(), this.onClick);
    }
    removeListenersForElements() {
        this.j.e.off(this._eventsList(), this.onClick);
    }
    /**
     * Show the inline WYSIWYG toolbar editor.
     */
    showInlineToolbar(bound) {
        this.showPopup(() => {
            if (bound) {
                return bound;
            }
            const { range } = this.j.s;
            return range.getBoundingClientRect();
        }, 'toolbar');
    }
}
inlinePopup.requires = ['select'];
__decorate([
    cache
], inlinePopup.prototype, "popup", null);
__decorate([
    cache
], inlinePopup.prototype, "toolbar", null);
__decorate([
    autobind
], inlinePopup.prototype, "onClick", null);
__decorate([
    wait((ctx) => !ctx.j.isLocked)
], inlinePopup.prototype, "showPopup", null);
__decorate([
    watch([':clickEditor', ':beforeCommandDelete', ':backSpaceAfterDelete']),
    autobind
], inlinePopup.prototype, "hidePopup", null);
__decorate([
    watch(':outsideClick')
], inlinePopup.prototype, "onOutsideClick", null);
__decorate([
    autobind
], inlinePopup.prototype, "onSelectionStart", null);
__decorate([
    autobind
], inlinePopup.prototype, "onSelectionEnd", null);
__decorate([
    debounce(ctx => ctx.defaultTimeout)
], inlinePopup.prototype, "onSelectionChange", null);
__decorate([
    autobind
], inlinePopup.prototype, "showInlineToolbar", null);
pluginSystem.add('inlinePopup', inlinePopup);
