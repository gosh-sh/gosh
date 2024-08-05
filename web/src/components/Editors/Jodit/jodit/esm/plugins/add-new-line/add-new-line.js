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
import { autobind, throttle, watch } from "../../core/decorators/index.js";
import { pluginSystem } from "../../core/global.js";
import { call, offset, position, scrollIntoViewIfNeeded } from "../../core/helpers/index.js";
import { Dom, Icon, Plugin } from "../../modules/index.js";
import "./config.js";
const ns = 'addnewline';
/**
 * Create helper for adding new paragraph(Jodit.defaultOptions.enter tag) before iframe, table or image
 */
export class addNewLine extends Plugin {
    constructor() {
        super(...arguments);
        this.__line = this.j.c.fromHTML(`<div role="button" tabindex="-1" title="${this.j.i18n('Break')}" class="jodit-add-new-line"><span>${Icon.get('enter')}</span></div>`);
        this.__isMatchedTag = (node) => Boolean(node &&
            this.j.o.addNewLineTagsTriggers.includes(node.nodeName.toLowerCase()));
        this.__isBeforeContent = false;
        this.__lineInFocus = false;
        this.__isShown = false;
        this.__hideForce = () => {
            if (!this.__isShown) {
                return;
            }
            this.__isShown = false;
            this.j.async.clearTimeout(this.__timeout);
            this.__lineInFocus = false;
            Dom.safeRemove(this.__line);
            this.__line.style.setProperty('--jd-anl-handle-offset', '0');
        };
        this.__canGetFocus = (elm) => {
            return (elm != null &&
                Dom.isBlock(elm) &&
                !/^(img|table|iframe|hr)$/i.test(elm.nodeName));
        };
        this.__onClickLine = (e) => {
            const editor = this.j;
            const p = editor.createInside.element(editor.o.enter);
            if (this.__isBeforeContent &&
                this.__current &&
                this.__current.parentNode) {
                if (this.__current === editor.editor) {
                    Dom.prepend(editor.editor, p);
                }
                else {
                    this.__current.parentNode.insertBefore(p, this.__current);
                }
            }
            else {
                editor.editor.appendChild(p);
            }
            editor.s.setCursorIn(p);
            scrollIntoViewIfNeeded(p, editor.editor, editor.ed);
            editor.synchronizeValues();
            this.__hideForce();
            e.preventDefault();
        };
    }
    __show() {
        if (this.j.o.readonly || this.j.isLocked) {
            return;
        }
        this.j.async.clearTimeout(this.__timeout);
        if (this.__isShown) {
            return;
        }
        this.__isShown = true;
        this.j.container.appendChild(this.__line);
        this.__line.style.width = this.j.container.clientWidth + 'px';
    }
    onLock(isLocked) {
        if (isLocked && this.__isShown) {
            this.__hideForce();
        }
    }
    __hide() {
        if (!this.__isShown || this.__lineInFocus) {
            return;
        }
        this.__timeout = this.j.async.setTimeout(this.__hideForce, {
            timeout: 500,
            label: 'add-new-line-hide'
        });
    }
    afterInit(editor) {
        if (!editor.o.addNewLine) {
            return;
        }
        editor.e
            .on(this.__line, 'mousemove', (e) => {
            e.stopPropagation();
        })
            .on(this.__line, 'mousedown touchstart', this.__onClickLine)
            .on('change', this.__hideForce)
            .on(this.__line, 'mouseenter', () => {
            this.j.async.clearTimeout(this.__timeout);
            this.__lineInFocus = true;
        })
            .on(this.__line, 'mouseleave', () => {
            this.__lineInFocus = false;
        })
            .on('changePlace', this.__addEventListeners.bind(this));
        this.__addEventListeners();
    }
    __addEventListeners() {
        const editor = this.j;
        editor.e
            .off(editor.editor, '.' + ns)
            .off(editor.container, '.' + ns)
            .on([editor.ow, editor.ew, editor.editor], 'scroll' + '.' + ns, this.__hideForce)
            .on(editor.editor, 'click' + '.' + ns, this.__hide)
            .on(editor.container, 'mouseleave' + '.' + ns, this.__hide)
            .on(editor.editor, 'mousemove' + '.' + ns, this.__onMouseMove);
    }
    onDblClickEditor(e) {
        const editor = this.j;
        if (!editor.o.readonly &&
            editor.o.addNewLineOnDBLClick &&
            e.target === editor.editor &&
            editor.s.isCollapsed()) {
            const editorBound = offset(editor.editor, editor, editor.ed);
            const top = e.pageY - editor.ew.scrollX;
            const p = editor.createInside.element(editor.o.enter);
            if (Math.abs(top - editorBound.top) <
                Math.abs(top - (editorBound.height + editorBound.top)) &&
                editor.editor.firstChild) {
                editor.editor.insertBefore(p, editor.editor.firstChild);
            }
            else {
                editor.editor.appendChild(p);
            }
            editor.s.setCursorIn(p);
            editor.synchronizeValues();
            this.__hideForce();
            e.preventDefault();
        }
    }
    __onMouseMove(e) {
        const editor = this.j;
        let currentElement = editor.ed.elementFromPoint(e.clientX, e.clientY);
        if (!Dom.isHTMLElement(currentElement) ||
            !Dom.isOrContains(editor.editor, currentElement)) {
            return;
        }
        if (editor.editor !== currentElement &&
            !this.__isMatchedTag(currentElement)) {
            currentElement = Dom.closest(currentElement, this.__isMatchedTag, editor.editor);
        }
        if (!currentElement) {
            this.__hide();
            return;
        }
        if (this.__isMatchedTag(currentElement)) {
            const parentBox = Dom.up(currentElement, Dom.isBlock, editor.editor);
            if (parentBox && parentBox !== editor.editor) {
                currentElement = parentBox;
            }
        }
        const pos = position(currentElement, this.j);
        let top = false;
        let { clientY, clientX } = e;
        if (this.j.iframe) {
            const { top, left } = position(this.j.iframe, this.j, true);
            clientY += top;
            clientX += left;
        }
        const delta = this.j.o.addNewLineDeltaShow;
        if (Math.abs(clientY - pos.top) <= delta) {
            top = pos.top;
            this.__isBeforeContent = true;
        }
        else if (Math.abs(clientY - (pos.top + pos.height)) <= delta) {
            top = pos.top + pos.height;
            this.__isBeforeContent = false;
        }
        const isEditor = editor.editor === currentElement;
        if (top !== false &&
            ((isEditor && !this.__isBeforeContent) ||
                (!isEditor &&
                    !call(this.__isBeforeContent ? Dom.prev : Dom.next, currentElement, this.__canGetFocus, editor.editor)))) {
            this.__line.style.top = top + 'px';
            this.__current = currentElement;
            this.__show();
            this.__line.style.setProperty('--jd-anl-handle-offset', clientX - pos.left - 10 + 'px');
        }
        else {
            this.__current = false;
            this.__hide();
        }
    }
    /** @override */
    beforeDestruct() {
        this.j.async.clearTimeout(this.__timeout);
        this.j.e.off(this.__line).off('changePlace', this.__addEventListeners);
        Dom.safeRemove(this.__line);
        this.j.e
            .off([this.j.ow, this.j.ew, this.j.editor], '.' + ns)
            .off(this.j.container, '.' + ns);
    }
}
__decorate([
    watch(':lock')
], addNewLine.prototype, "onLock", null);
__decorate([
    autobind
], addNewLine.prototype, "__hide", null);
__decorate([
    watch(':dblclick')
], addNewLine.prototype, "onDblClickEditor", null);
__decorate([
    throttle(ctx => ctx.defaultTimeout)
], addNewLine.prototype, "__onMouseMove", null);
pluginSystem.add('addNewLine', addNewLine);
