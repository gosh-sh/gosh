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
import { TEXT_HTML, TEXT_PLAIN } from "../../core/constants.js";
import { autobind, throttle } from "../../core/decorators/index.js";
import { Dom } from "../../core/dom/dom.js";
import { pluginSystem } from "../../core/global.js";
import { attr, ctrlKey, dataBind, getDataTransfer } from "../../core/helpers/index.js";
import { Plugin } from "../../core/plugin/index.js";
import { FileBrowserFiles } from "../../modules/file-browser/ui/index.js";
/**
 * Process drag and drop image from FileBrowser and movev image inside the editor
 */
export class dragAndDrop extends Plugin {
    constructor() {
        super(...arguments);
        this.isFragmentFromEditor = false;
        this.isCopyMode = false;
        this.startDragPoint = { x: 0, y: 0 };
        this.draggable = null;
        this.bufferRange = null;
        this.getText = (event) => {
            const dt = getDataTransfer(event);
            return dt ? dt.getData(TEXT_HTML) || dt.getData(TEXT_PLAIN) : null;
        };
    }
    /** @override */
    afterInit() {
        this.j.e.on([window, this.j.ed, this.j.editor], 'dragstart.DragAndDrop', this.onDragStart);
    }
    onDragStart(event) {
        let target = event.target;
        this.onDragEnd(); // remove old draggable
        this.isFragmentFromEditor = Dom.isOrContains(this.j.editor, target, true);
        this.isCopyMode = this.isFragmentFromEditor ? ctrlKey(event) : true; // we can move only element from editor
        if (this.isFragmentFromEditor) {
            const sel = this.j.s.sel;
            const range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
            if (range) {
                this.bufferRange = range.cloneRange();
            }
        }
        else {
            this.bufferRange = null;
        }
        this.startDragPoint.x = event.clientX;
        this.startDragPoint.y = event.clientY;
        if (isFileBrowserFilesItem(target)) {
            target = target.querySelector('img');
        }
        if (Dom.isTag(target, 'img')) {
            this.draggable = target.cloneNode(true);
            dataBind(this.draggable, 'target', target);
        }
        this.addDragListeners();
    }
    addDragListeners() {
        this.j.e
            .on('dragover', this.onDrag)
            .on('drop.DragAndDrop', this.onDrop)
            .on(window, 'dragend.DragAndDrop drop.DragAndDrop mouseup.DragAndDrop', this.onDragEnd);
    }
    removeDragListeners() {
        this.j.e
            .off('dragover', this.onDrag)
            .off('drop.DragAndDrop', this.onDrop)
            .off(window, 'dragend.DragAndDrop drop.DragAndDrop mouseup.DragAndDrop', this.onDragEnd);
    }
    onDrag(event) {
        if (this.draggable) {
            this.j.e.fire('hidePopup');
            this.j.s.insertCursorAtPoint(event.clientX, event.clientY);
            event.preventDefault();
            event.stopPropagation();
        }
    }
    onDragEnd() {
        if (this.draggable) {
            Dom.safeRemove(this.draggable);
            this.draggable = null;
        }
        this.isCopyMode = false;
        this.removeDragListeners();
    }
    onDrop(event) {
        if (!event.dataTransfer ||
            !event.dataTransfer.files ||
            !event.dataTransfer.files.length) {
            if (!this.isFragmentFromEditor && !this.draggable) {
                this.j.e.fire('paste', event);
                event.preventDefault();
                event.stopPropagation();
                return false;
            }
            const sel = this.j.s.sel;
            const range = this.bufferRange ||
                (sel && sel.rangeCount ? sel.getRangeAt(0) : null);
            let fragment = null;
            if (!this.draggable && range) {
                fragment = this.isCopyMode
                    ? range.cloneContents()
                    : range.extractContents();
            }
            else if (this.draggable) {
                if (this.isCopyMode) {
                    const [tagName, field] = attr(this.draggable, '-is-file') === '1'
                        ? ['a', 'href']
                        : ['img', 'src'];
                    fragment = this.j.createInside.element(tagName);
                    fragment.setAttribute(field, attr(this.draggable, 'data-src') ||
                        attr(this.draggable, 'src') ||
                        '');
                    if (tagName === 'a') {
                        fragment.textContent = attr(fragment, field) || '';
                    }
                }
                else {
                    fragment = dataBind(this.draggable, 'target');
                }
            }
            else if (this.getText(event)) {
                fragment = this.j.createInside.fromHTML(this.getText(event));
            }
            sel && sel.removeAllRanges();
            this.j.s.insertCursorAtPoint(event.clientX, event.clientY);
            if (fragment) {
                this.j.s.insertNode(fragment, false, false);
                if (range && fragment.firstChild && fragment.lastChild) {
                    range.setStartBefore(fragment.firstChild);
                    range.setEndAfter(fragment.lastChild);
                    this.j.s.selectRange(range);
                    this.j.e.fire('synchro');
                }
                if (Dom.isTag(fragment, 'img') && this.j.events) {
                    this.j.e.fire('afterInsertImage', fragment);
                }
            }
            event.preventDefault();
            event.stopPropagation();
        }
        this.isFragmentFromEditor = false;
        this.removeDragListeners();
    }
    /** @override */
    beforeDestruct() {
        this.onDragEnd();
        this.j.e
            .off(window, '.DragAndDrop')
            .off('.DragAndDrop')
            .off([window, this.j.ed, this.j.editor], 'dragstart.DragAndDrop', this.onDragStart);
    }
}
__decorate([
    autobind
], dragAndDrop.prototype, "onDragStart", null);
__decorate([
    throttle(ctx => ctx.defaultTimeout / 10)
], dragAndDrop.prototype, "onDrag", null);
__decorate([
    autobind
], dragAndDrop.prototype, "onDragEnd", null);
__decorate([
    autobind
], dragAndDrop.prototype, "onDrop", null);
/**
 * @private
 */
function isFileBrowserFilesItem(target) {
    return (Dom.isElement(target) &&
        target.classList.contains(FileBrowserFiles.prototype.getFullElName('item')));
}
pluginSystem.add('dragAndDrop', dragAndDrop);
