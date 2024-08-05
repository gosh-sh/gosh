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
import { autobind, throttle } from "../../core/decorators/index.js";
import { Dom } from "../../core/dom/index.js";
import { getContainer, pluginSystem } from "../../core/global.js";
import { css, ctrlKey, dataBind, splitArray } from "../../core/helpers/index.js";
import { Plugin } from "../../core/plugin/index.js";
import "./config.js";
var DragState;
(function (DragState) {
    DragState[DragState["IDLE"] = 0] = "IDLE";
    DragState[DragState["WAIT_DRAGGING"] = 1] = "WAIT_DRAGGING";
    DragState[DragState["DRAGGING"] = 2] = "DRAGGING";
})(DragState || (DragState = {}));
/**
 * Process drag and drop image or another element inside the editor
 */
export class dragAndDropElement extends Plugin {
    constructor() {
        super(...arguments);
        this.dragList = [];
        this.draggable = null;
        this.isCopyMode = false;
        /**
         * Shift in pixels after which we consider that the transfer of the element has begun
         */
        this.diffStep = 10;
        this.startX = 0;
        this.startY = 0;
        this.state = DragState.IDLE;
    }
    /** @override */
    afterInit() {
        this.dragList = this.j.o.draggableTags
            ? splitArray(this.j.o.draggableTags)
                .filter(Boolean)
                .map(item => item.toLowerCase())
            : [];
        if (!this.dragList.length) {
            return;
        }
        this.j.e.on('mousedown dragstart', this.onDragStart);
    }
    /**
     * Drag start handler
     */
    onDragStart(event) {
        if (event.type === 'dragstart' && this.draggable) {
            return false;
        }
        if (this.state > DragState.IDLE) {
            return;
        }
        const target = event.target;
        if (!this.dragList.length || !target) {
            return;
        }
        const matched = (node) => Boolean(node && this.dragList.includes(node.nodeName.toLowerCase()));
        let lastTarget = Dom.furthest(target, matched, this.j.editor) ||
            (matched(target) ? target : null);
        if (!lastTarget) {
            return;
        }
        if (Dom.isTag(lastTarget.parentElement, 'a') &&
            lastTarget.parentElement.firstChild === lastTarget &&
            lastTarget.parentElement.lastChild === lastTarget) {
            lastTarget = lastTarget.parentElement;
        }
        this.startX = event.clientX;
        this.startY = event.clientY;
        this.isCopyMode = ctrlKey(event); // we can move only element from editor
        this.draggable = lastTarget.cloneNode(true);
        dataBind(this.draggable, 'target', lastTarget);
        this.state = DragState.WAIT_DRAGGING;
        this.addDragListeners();
    }
    /**
     * Mouse move handler handler
     */
    onDrag(event) {
        if (!this.draggable || this.state === DragState.IDLE) {
            return;
        }
        const x = event.clientX, y = event.clientY;
        if (this.state === DragState.WAIT_DRAGGING &&
            Math.sqrt(Math.pow(x - this.startX, 2) + Math.pow(y - this.startY, 2)) < this.diffStep) {
            return;
        }
        if (this.state === DragState.WAIT_DRAGGING) {
            this.j.lock('drag-and-drop-element');
            this.state = DragState.DRAGGING;
        }
        this.j.e.fire('hidePopup hideResizer');
        if (!this.draggable.parentNode) {
            const target = dataBind(this.draggable, 'target');
            css(this.draggable, {
                zIndex: 10000000000000,
                pointerEvents: 'none',
                pointer: 'drag',
                position: 'fixed',
                opacity: 0.7,
                display: 'inline-block',
                left: event.clientX,
                top: event.clientY,
                width: target?.offsetWidth ?? 100,
                height: target?.offsetHeight ?? 100
            });
            getContainer(this.j, dragAndDropElement).appendChild(this.draggable);
        }
        css(this.draggable, {
            left: event.clientX,
            top: event.clientY
        });
        this.j.s.insertCursorAtPoint(event.clientX, event.clientY);
    }
    /**
     * Mouseup handler in any place
     */
    onDragEnd() {
        if (this.isInDestruct) {
            return;
        }
        this.removeDragListeners();
        this.j.unlock();
        this.state = DragState.IDLE;
        if (this.draggable) {
            Dom.safeRemove(this.draggable);
            this.draggable = null;
        }
    }
    /**
     * Mouseup handler inside editor
     */
    onDrop() {
        if (!this.draggable || this.state < DragState.DRAGGING) {
            this.onDragEnd();
            return;
        }
        let fragment = dataBind(this.draggable, 'target');
        this.onDragEnd();
        if (this.isCopyMode) {
            fragment = fragment.cloneNode(true);
        }
        const { parentElement } = fragment;
        this.j.s.insertNode(fragment, true, false);
        if (parentElement &&
            Dom.isEmpty(parentElement) &&
            !Dom.isCell(parentElement)) {
            Dom.safeRemove(parentElement);
        }
        if (Dom.isTag(fragment, 'img') && this.j.e) {
            this.j.e.fire('afterInsertImage', fragment);
        }
        this.j.e.fire('synchro');
    }
    /**
     * Add global event listener after drag start
     */
    addDragListeners() {
        this.j.e
            .on(this.j.editor, 'mousemove', this.onDrag)
            .on('mouseup', this.onDrop)
            .on([this.j.ew, this.ow], 'mouseup', this.onDragEnd);
    }
    /**
     * Remove global event listener after drag start
     */
    removeDragListeners() {
        this.j.e
            .off(this.j.editor, 'mousemove', this.onDrag)
            .off('mouseup', this.onDrop)
            .off([this.j.ew, this.ow], 'mouseup', this.onDragEnd);
    }
    /** @override */
    beforeDestruct() {
        this.onDragEnd();
        this.j.e.off('mousedown dragstart', this.onDragStart);
        this.removeDragListeners();
    }
}
__decorate([
    autobind
], dragAndDropElement.prototype, "onDragStart", null);
__decorate([
    throttle(ctx => ctx.defaultTimeout / 10)
], dragAndDropElement.prototype, "onDrag", null);
__decorate([
    autobind
], dragAndDropElement.prototype, "onDragEnd", null);
__decorate([
    autobind
], dragAndDropElement.prototype, "onDrop", null);
pluginSystem.add('dragAndDropElement', dragAndDropElement);
