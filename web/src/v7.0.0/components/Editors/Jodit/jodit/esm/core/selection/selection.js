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
import * as consts from "../constants.js";
import { INSEPARABLE_TAGS, INVISIBLE_SPACE, INVISIBLE_SPACE_REG_EXP_END as INV_END, INVISIBLE_SPACE_REG_EXP_START as INV_START, IS_PROD } from "../constants.js";
import { autobind } from "../decorators/index.js";
import { Dom } from "../dom/dom.js";
import { $$, attr, call, css, error, getScrollParent, scrollIntoViewIfNeeded, size, toArray } from "../helpers/index.js";
import { isFunction, isMarker, isString } from "../helpers/checker/index.js";
import { assert } from "../helpers/utils/assert.js";
import { moveTheNodeAlongTheEdgeOutward } from "./helpers/move-the-node-along-the-edge-outward.js";
import "./interface.js";
import { CommitStyle } from "./style/commit-style.js";
export class Selection {
    constructor(jodit) {
        this.jodit = jodit;
        jodit.e.on('removeMarkers', () => {
            this.removeMarkers();
        });
    }
    /**
     * Short alias for this.jodit
     */
    get j() {
        return this.jodit;
    }
    /**
     * Throw Error exception if parameter is not Node
     */
    errorNode(node) {
        if (!Dom.isNode(node)) {
            throw error('Parameter node must be instance of Node');
        }
    }
    /**
     * Return current work place - for Jodit is Editor
     */
    get area() {
        return this.j.editor;
    }
    /**
     * Editor Window - it can be different for iframe mode
     */
    get win() {
        return this.j.ew;
    }
    /**
     * Current jodit editor doc
     */
    get doc() {
        return this.j.ed;
    }
    /**
     * Return current selection object
     */
    get sel() {
        if (this.j.o.shadowRoot &&
            isFunction(this.j.o.shadowRoot.getSelection)) {
            return this.j.o.shadowRoot.getSelection();
        }
        return this.win.getSelection();
    }
    /**
     * Return first selected range or create new
     */
    get range() {
        const sel = this.sel;
        return sel && sel.rangeCount ? sel.getRangeAt(0) : this.createRange();
    }
    /**
     * Checks if the selected text is currently inside the editor
     */
    get isInsideArea() {
        const { sel } = this;
        const range = sel?.rangeCount ? sel.getRangeAt(0) : null;
        return !(!range || !Dom.isOrContains(this.area, range.startContainer));
    }
    /**
     * Return current selection object
     * @param select - Immediately add in selection
     */
    createRange(select = false) {
        const range = this.doc.createRange();
        if (select) {
            this.selectRange(range);
        }
        return range;
    }
    /**
     * Remove all selected content
     */
    remove() {
        const sel = this.sel, current = this.current();
        if (sel && current) {
            for (let i = 0; i < sel.rangeCount; i += 1) {
                sel.getRangeAt(i).deleteContents();
                sel.getRangeAt(i).collapse(true);
            }
        }
    }
    /**
     * Clear all selection
     */
    clear() {
        if (this.sel?.rangeCount) {
            this.sel?.removeAllRanges();
        }
    }
    /**
     * Remove node element from editor
     */
    removeNode(node) {
        if (!Dom.isOrContains(this.j.editor, node, true)) {
            throw error("Selection.removeNode can remove only editor's children");
        }
        Dom.safeRemove(node);
        this.j.e.fire('afterRemoveNode', node);
    }
    /**
     * Insert the cursor to any point x, y
     *
     * @param x - Coordinate by horizontal
     * @param y - Coordinate by vertical
     * @returns false - Something went wrong
     */
    insertCursorAtPoint(x, y) {
        this.removeMarkers();
        try {
            const rng = this.createRange();
            (() => {
                if (this.doc.caretPositionFromPoint) {
                    const caret = this.doc.caretPositionFromPoint(x, y);
                    if (caret) {
                        rng.setStart(caret.offsetNode, caret.offset);
                        return;
                    }
                }
                if (this.doc.caretRangeFromPoint) {
                    const caret = this.doc.caretRangeFromPoint(x, y);
                    assert(caret, 'Incorrect caretRangeFromPoint behaviour');
                    rng.setStart(caret.startContainer, caret.startOffset);
                }
            })();
            rng.collapse(true);
            this.selectRange(rng);
            return true;
        }
        catch { }
        return false;
    }
    /**
     * Check if editor has selection markers
     */
    get hasMarkers() {
        return Boolean(this.markers.length);
    }
    /**
     * Check if editor has selection markers
     */
    get markers() {
        return $$('span[data-' + consts.MARKER_CLASS + ']', this.area);
    }
    /**
     * Remove all markers
     */
    removeMarkers() {
        Dom.safeRemove.apply(null, this.markers);
    }
    /**
     * Create marker element
     */
    marker(atStart = false, range) {
        let newRange = null;
        if (range) {
            newRange = range.cloneRange();
            newRange.collapse(atStart);
        }
        const marker = this.j.createInside.span();
        marker.id =
            consts.MARKER_CLASS +
                '_' +
                Number(new Date()) +
                '_' +
                String(Math.random()).slice(2);
        marker.style.lineHeight = '0';
        marker.style.display = 'none';
        Dom.markTemporary(marker);
        attr(marker, 'data-' + consts.MARKER_CLASS, atStart ? 'start' : 'end');
        marker.appendChild(this.j.createInside.text(consts.INVISIBLE_SPACE));
        if (newRange) {
            if (Dom.isOrContains(this.area, atStart ? newRange.startContainer : newRange.endContainer)) {
                // Here need do unsafe inserting
                // Deny Dom.safeInsertNode(newRange, marker);
                // Apply style -> Test Style module -> Base apply -> For selection <p><strong>|test|</strong></p> apply style {"element":"em","style":{"fontStyle":"italic"}}
                newRange.insertNode(marker);
            }
        }
        return marker;
    }
    /**
     * Restores user selections using marker invisible elements in the DOM.
     */
    restore() {
        let range = false;
        const markAttr = (start) => `span[data-${consts.MARKER_CLASS}=${start ? 'start' : 'end'}]`;
        const start = this.area.querySelector(markAttr(true)), end = this.area.querySelector(markAttr(false));
        if (!start) {
            return;
        }
        range = this.createRange();
        if (!end) {
            const previousNode = start.previousSibling;
            if (Dom.isText(previousNode)) {
                range.setStart(previousNode, previousNode.nodeValue ? previousNode.nodeValue.length : 0);
            }
            else {
                range.setStartBefore(start);
            }
            Dom.safeRemove(start);
            range.collapse(true);
        }
        else {
            range.setStartAfter(start);
            Dom.safeRemove(start);
            range.setEndBefore(end);
            Dom.safeRemove(end);
        }
        if (range) {
            this.selectRange(range);
        }
    }
    fakes() {
        const sel = this.sel;
        if (!sel || !sel.rangeCount) {
            return [];
        }
        const range = sel.getRangeAt(0);
        assert(range, 'Range is null');
        const left = range.cloneRange();
        left.collapse(true);
        const fakeLeft = this.j.createInside.fake();
        Dom.safeInsertNode(left, fakeLeft);
        range.setStartBefore(fakeLeft);
        const result = [fakeLeft];
        if (!range.collapsed) {
            const right = range.cloneRange();
            right.collapse(false);
            const fakeRight = this.j.createInside.fake();
            Dom.safeInsertNode(right, fakeRight);
            range.setEndAfter(fakeRight);
            result.push(fakeRight);
        }
        this.selectRange(range);
        return result;
    }
    restoreFakes(fakes) {
        const nodes = fakes.filter(n => n.isConnected);
        if (!nodes.length) {
            return;
        }
        const [fakeLeft, fakeRight] = nodes;
        const range = this.createRange();
        range.setStartAfter(fakeLeft);
        if (fakeRight) {
            range.setEndBefore(fakeRight);
        }
        this.selectRange(range);
        if (fakeLeft.parentNode?.firstChild !== fakeLeft.parentNode?.lastChild) {
            Dom.safeRemove(fakeLeft);
        }
        if (fakeRight?.parentNode?.firstChild !==
            fakeRight?.parentNode?.lastChild) {
            Dom.safeRemove(fakeRight);
        }
    }
    /**
     * Saves selections using marker invisible elements in the DOM.
     * @param silent - Do not change current range
     */
    save(silent = false) {
        if (this.hasMarkers) {
            return [];
        }
        const sel = this.sel;
        if (!sel || !sel.rangeCount) {
            return [];
        }
        const info = [], length = sel.rangeCount, ranges = [];
        for (let i = 0; i < length; i += 1) {
            ranges[i] = sel.getRangeAt(i);
            if (ranges[i].collapsed) {
                const start = this.marker(true, ranges[i]);
                info[i] = {
                    startId: start.id,
                    collapsed: true,
                    startMarker: start.outerHTML
                };
            }
            else {
                const start = this.marker(true, ranges[i]);
                const end = this.marker(false, ranges[i]);
                info[i] = {
                    startId: start.id,
                    endId: end.id,
                    collapsed: false,
                    startMarker: start.outerHTML,
                    endMarker: end.outerHTML
                };
            }
        }
        if (!silent) {
            sel.removeAllRanges();
            for (let i = length - 1; i >= 0; --i) {
                const startElm = this.doc.getElementById(info[i].startId);
                if (!startElm) {
                    continue;
                }
                if (info[i].collapsed) {
                    ranges[i].setStartAfter(startElm);
                    ranges[i].collapse(true);
                }
                else {
                    ranges[i].setStartBefore(startElm);
                    if (info[i].endId) {
                        const endElm = this.doc.getElementById(info[i].endId);
                        if (endElm) {
                            ranges[i].setEndAfter(endElm);
                        }
                    }
                }
                try {
                    sel.addRange(ranges[i].cloneRange());
                }
                catch { }
            }
        }
        return info;
    }
    /**
     * Set focus in editor
     */
    focus(options = {
        preventScroll: true
    }) {
        if (!this.isFocused()) {
            const scrollParent = getScrollParent(this.j.container), scrollTop = scrollParent?.scrollTop;
            if (this.j.iframe) {
                if (this.doc.readyState === 'complete') {
                    this.j.iframe.focus(options);
                }
            }
            this.win.focus();
            this.area.focus(options);
            if (scrollTop && scrollParent?.scrollTo) {
                scrollParent.scrollTo(0, scrollTop);
            }
            const sel = this.sel, range = sel?.rangeCount ? sel?.getRangeAt(0) : null;
            if (!range || !Dom.isOrContains(this.area, range.startContainer)) {
                const range = this.createRange();
                range.setStart(this.area, 0);
                range.collapse(true);
                this.selectRange(range, false);
            }
            if (!this.j.editorIsActive) {
                this.j?.events?.fire('focus');
            }
            return true;
        }
        return false;
    }
    /**
     * Checks whether the current selection is something or just set the cursor is
     * @returns true Selection does't have content
     */
    isCollapsed() {
        const sel = this.sel;
        for (let r = 0; sel && r < sel.rangeCount; r += 1) {
            if (!sel.getRangeAt(r).collapsed) {
                return false;
            }
        }
        return true;
    }
    /**
     * Checks whether the editor currently in focus
     */
    isFocused() {
        return (this.doc.hasFocus &&
            this.doc.hasFocus() &&
            this.area === this.doc.activeElement);
    }
    /**
     * Returns the current element under the cursor inside editor
     */
    current(checkChild = true) {
        if (this.j.getRealMode() === consts.MODE_WYSIWYG) {
            const sel = this.sel;
            if (!sel || sel.rangeCount === 0) {
                return null;
            }
            const range = sel.getRangeAt(0);
            let node = range.startContainer, rightMode = false;
            const child = (nd) => rightMode ? nd.lastChild : nd.firstChild;
            if (Dom.isTag(node, 'br') && sel.isCollapsed) {
                return node;
            }
            if (!Dom.isText(node)) {
                node = range.startContainer.childNodes[range.startOffset];
                if (!node) {
                    node =
                        range.startContainer.childNodes[range.startOffset - 1];
                    rightMode = true;
                }
                if (node && sel.isCollapsed && !Dom.isText(node)) {
                    // test Current method - Cursor in the left of some SPAN
                    if (!rightMode && Dom.isText(node.previousSibling)) {
                        node = node.previousSibling;
                    }
                    else if (checkChild) {
                        let current = child(node);
                        while (current) {
                            if (current && Dom.isText(current)) {
                                node = current;
                                break;
                            }
                            current = child(current);
                        }
                    }
                }
                if (node && !sel.isCollapsed && !Dom.isText(node)) {
                    let leftChild = node, rightChild = node;
                    do {
                        leftChild = leftChild.firstChild;
                        rightChild = rightChild.lastChild;
                    } while (leftChild && rightChild && !Dom.isText(leftChild));
                    if (leftChild === rightChild &&
                        leftChild &&
                        Dom.isText(leftChild)) {
                        node = leftChild;
                    }
                }
            }
            // check - cursor inside editor
            if (node && Dom.isOrContains(this.area, node)) {
                return node;
            }
        }
        return null;
    }
    /**
     * Insert element in editor
     *
     * @param insertCursorAfter - After insert, cursor will move after element
     * @param fireChange - After insert, editor fire change event. You can prevent this behavior
     */
    insertNode(node, insertCursorAfter = true, fireChange = true) {
        this.errorNode(node);
        const child = Dom.isFragment(node) ? node.lastChild : node;
        this.j.e.fire('safeHTML', node);
        if (!this.isFocused() && this.j.isEditorMode()) {
            this.focus();
            this.restore();
        }
        const sel = this.sel;
        this.j.history.snapshot.transaction(() => {
            if (!this.isCollapsed()) {
                this.j.execCommand('Delete');
            }
            this.j.e.fire('beforeInsertNode', node);
            if (sel && sel.rangeCount) {
                const range = sel.getRangeAt(0);
                if (Dom.isOrContains(this.area, range.commonAncestorContainer)) {
                    Dom.safeInsertNode(range, node);
                }
                else {
                    this.area.appendChild(node);
                }
            }
            else {
                this.area.appendChild(node);
            }
            const setCursor = (node) => {
                if (Dom.isBlock(node)) {
                    const child = node.lastChild;
                    if (child) {
                        return setCursor(child);
                    }
                }
                this.setCursorAfter(node);
            };
            if (insertCursorAfter) {
                if (Dom.isFragment(node)) {
                    child && setCursor(child);
                }
                else {
                    setCursor(node);
                }
            }
            if (this.j.o.scrollToPastedContent) {
                scrollIntoViewIfNeeded(child ?? node, this.j.editor, this.doc);
            }
        });
        if (fireChange && this.j.events) {
            this.j.__imdSynchronizeValues();
        }
        if (this.j.events) {
            this.j.e.fire('afterInsertNode', Dom.isFragment(node) ? child : node);
        }
    }
    /**
     * Inserts in the current cursor position some HTML snippet
     *
     * @param html - HTML The text to be inserted into the document
     * @example
     * ```javascript
     * parent.s.insertHTML('<img src="image.png"/>');
     * ```
     */
    insertHTML(html, insertCursorAfter = true) {
        if (html === '') {
            return;
        }
        const node = this.j.createInside.div();
        const fragment = this.j.createInside.fragment();
        let lastChild;
        if (!this.isFocused() && this.j.isEditorMode()) {
            this.focus();
            this.restore();
        }
        if (!Dom.isNode(html)) {
            node.innerHTML = html.toString();
        }
        else {
            node.appendChild(html);
        }
        if (!this.j.isEditorMode() &&
            this.j.e.fire('insertHTML', node.innerHTML) === false) {
            return;
        }
        lastChild = node.lastChild;
        if (!lastChild) {
            return;
        }
        while (node.firstChild) {
            lastChild = node.firstChild;
            fragment.appendChild(node.firstChild);
        }
        this.insertNode(fragment, insertCursorAfter, false);
        // There is no need to use synchronizeValues because you need to apply the changes immediately
        this.j.__imdSynchronizeValues();
    }
    /**
     * Insert image in editor
     *
     * @param url - URL for image, or HTMLImageElement
     * @param styles - If specified, it will be applied <code>$(image).css(styles)</code>
     */
    insertImage(url, styles = null, defaultWidth = null) {
        const image = isString(url) ? this.j.createInside.element('img') : url;
        if (isString(url)) {
            image.setAttribute('src', url);
        }
        if (defaultWidth != null) {
            let dw = defaultWidth.toString();
            if (dw &&
                'auto' !== dw &&
                String(dw).indexOf('px') < 0 &&
                String(dw).indexOf('%') < 0) {
                dw += 'px';
            }
            call(
            // @ts-ignore
            this.j.o.resizer.forImageChangeAttributes ? attr : css, image, 'width', 
            // @ts-ignore
            dw);
        }
        if (styles && typeof styles === 'object') {
            css(image, styles);
        }
        const onload = () => {
            if (image.naturalHeight < image.offsetHeight ||
                image.naturalWidth < image.offsetWidth) {
                image.style.width = '';
                image.style.height = '';
            }
            image.removeEventListener('load', onload);
        };
        this.j.e.on(image, 'load', onload);
        if (image.complete) {
            onload();
        }
        this.insertNode(image);
        /**
         * Triggered after image was inserted [[Select.insertImage]]. This method can executed from
         * [[FileBrowser]] or [[Uploader]]
         * @example
         * ```javascript
         * var editor = Jodit.make("#redactor");
         * editor.e.on('afterInsertImage', function (image) {
         *     image.className = 'bloghead4';
         * });
         * ```
         */
        this.j.e.fire('afterInsertImage', image);
    }
    /**
     * Call callback for all selection node
     */
    eachSelection(callback) {
        const sel = this.sel;
        if (sel && sel.rangeCount) {
            const range = sel.getRangeAt(0);
            let root = range.commonAncestorContainer;
            if (!Dom.isHTMLElement(root)) {
                root = root.parentElement;
            }
            const nodes = [], startOffset = range.startOffset, length = root.childNodes.length, elementOffset = startOffset < length ? startOffset : length - 1;
            let start = range.startContainer === this.area
                ? root.childNodes[elementOffset]
                : range.startContainer, end = range.endContainer === this.area
                ? root.childNodes[range.endOffset - 1]
                : range.endContainer;
            if (Dom.isText(start) &&
                start === range.startContainer &&
                range.startOffset === start.nodeValue?.length &&
                start.nextSibling) {
                start = start.nextSibling;
            }
            if (Dom.isText(end) &&
                end === range.endContainer &&
                range.endOffset === 0 &&
                end.previousSibling) {
                end = end.previousSibling;
            }
            const checkElm = (node) => {
                if (node &&
                    node !== root &&
                    !Dom.isEmptyTextNode(node) &&
                    !isMarker(node)) {
                    nodes.push(node);
                }
            };
            checkElm(start);
            if (start !== end && Dom.isOrContains(root, start, true)) {
                Dom.find(start, node => {
                    checkElm(node);
                    // checks parentElement as well because partial selections are not equal to entire element
                    return (node === end ||
                        (node && node.contains && node.contains(end)));
                }, root, true, false);
            }
            const forEvery = (current) => {
                if (!Dom.isOrContains(this.j.editor, current, true)) {
                    return;
                }
                if (current.nodeName.match(/^(UL|OL)$/)) {
                    return toArray(current.childNodes).forEach(forEvery);
                }
                if (Dom.isTag(current, 'li')) {
                    if (current.firstChild) {
                        current = current.firstChild;
                    }
                    else {
                        const currentB = this.j.createInside.text(INVISIBLE_SPACE);
                        current.appendChild(currentB);
                        current = currentB;
                    }
                }
                callback(current);
            };
            if (nodes.length === 0 && Dom.isEmptyTextNode(start)) {
                nodes.push(start);
            }
            if (nodes.length === 0 && start.firstChild) {
                nodes.push(start.firstChild);
            }
            nodes.forEach(forEvery);
        }
    }
    /**
     * Checks if the cursor is at the end(start) block
     *
     * @param  start - true - check whether the cursor is at the start block
     * @param parentBlock - Find in this
     * @param fake - Node for cursor position
     *
     * @returns true - the cursor is at the end(start) block, null - cursor somewhere outside
     */
    cursorInTheEdge(start, parentBlock, fake = null) {
        const end = !start, range = this.sel?.getRangeAt(0);
        fake ?? (fake = this.current(false));
        if (!range || !fake || !Dom.isOrContains(parentBlock, fake, true)) {
            return null;
        }
        const container = start ? range.startContainer : range.endContainer;
        const offset = start ? range.startOffset : range.endOffset;
        const isSignificant = (elm) => Boolean(elm &&
            !Dom.isTag(elm, 'br') &&
            !Dom.isEmptyTextNode(elm) &&
            !Dom.isTemporary(elm) &&
            !(Dom.isElement(elm) &&
                this.j.e.fire('isInvisibleForCursor', elm) === true));
        // check right offset
        if (Dom.isText(container)) {
            const text = container.nodeValue?.length ? container.nodeValue : '';
            if (end && text.replace(INV_END(), '').length > offset) {
                return false;
            }
            const inv = INV_START().exec(text);
            if (start &&
                ((inv && inv[0].length < offset) || (!inv && offset > 0))) {
                return false;
            }
        }
        else {
            const children = toArray(container.childNodes);
            if (end) {
                if (children.slice(offset).some(isSignificant)) {
                    return false;
                }
            }
            else {
                if (children.slice(0, offset).some(isSignificant)) {
                    return false;
                }
            }
        }
        let next = fake;
        while (next && next !== parentBlock) {
            const nextOne = Dom.sibling(next, start);
            if (!nextOne) {
                next = next.parentNode;
                continue;
            }
            next = nextOne;
            if (next && isSignificant(next)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Wrapper for cursorInTheEdge
     */
    cursorOnTheLeft(parentBlock, fake) {
        return this.cursorInTheEdge(true, parentBlock, fake);
    }
    /**
     * Wrapper for cursorInTheEdge
     */
    cursorOnTheRight(parentBlock, fake) {
        return this.cursorInTheEdge(false, parentBlock, fake);
    }
    /**
     * Set cursor after the node
     * @returns fake invisible textnode. After insert it can be removed
     */
    setCursorAfter(node) {
        return this.setCursorNearWith(node, false);
    }
    /**
     * Set cursor before the node
     * @returns fake invisible textnode. After insert it can be removed
     */
    setCursorBefore(node) {
        return this.setCursorNearWith(node, true);
    }
    /**
     * Add fake node for new cursor position
     */
    setCursorNearWith(node, inStart) {
        this.errorNode(node);
        if (!Dom.up(node, (elm) => elm === this.area || (elm && elm.parentNode === this.area), this.area)) {
            throw error('Node element must be in editor');
        }
        const range = this.createRange();
        let fakeNode = null;
        if (!Dom.isText(node)) {
            fakeNode = this.j.createInside.fake();
            inStart ? range.setStartBefore(node) : range.setEndAfter(node);
            range.collapse(inStart);
            Dom.safeInsertNode(range, fakeNode);
            range.selectNode(fakeNode);
        }
        else {
            if (inStart) {
                range.setStart(node, 0);
            }
            else {
                range.setEnd(node, node.nodeValue?.length ?? 0);
            }
        }
        range.collapse(inStart);
        this.selectRange(range);
        return fakeNode;
    }
    /**
     * Set cursor in the node
     * @param inStart - set cursor in start of element
     */
    setCursorIn(node, inStart = false) {
        this.errorNode(node);
        if (!Dom.up(node, (elm) => elm === this.area || (elm && elm.parentNode === this.area), this.area)) {
            throw error('Node element must be in editor');
        }
        const range = this.createRange();
        let start = node, last = node;
        do {
            if (Dom.isText(start) || Dom.isTag(start, INSEPARABLE_TAGS)) {
                break;
            }
            last = start;
            start = inStart ? start.firstChild : start.lastChild;
        } while (start);
        if (!start) {
            const fakeNode = this.j.createInside.text(consts.INVISIBLE_SPACE);
            if (!Dom.isTag(last, INSEPARABLE_TAGS)) {
                last.appendChild(fakeNode);
                last = fakeNode;
            }
            else {
                start = last;
            }
        }
        const workElm = start || last;
        if (!Dom.isTag(workElm, INSEPARABLE_TAGS)) {
            range.selectNodeContents(workElm);
            range.collapse(inStart);
        }
        else {
            inStart || Dom.isTag(workElm, 'br')
                ? range.setStartBefore(workElm)
                : range.setEndAfter(workElm);
            range.collapse(inStart);
        }
        this.selectRange(range);
        return last;
    }
    /**
     * Set range selection
     */
    selectRange(range, focus = true) {
        const sel = this.sel;
        if (focus && !this.isFocused()) {
            this.focus();
        }
        if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
        }
        /**
         * Fired after change selection
         */
        this.j.e.fire('changeSelection');
        return this;
    }
    /**
     * Select node
     * @param inward - select all inside
     */
    select(node, inward = false) {
        this.errorNode(node);
        if (!Dom.up(node, (elm) => elm === this.area || (elm && elm.parentNode === this.area), this.area)) {
            throw error('Node element must be in editor');
        }
        const range = this.createRange();
        range[inward ? 'selectNodeContents' : 'selectNode'](node);
        return this.selectRange(range);
    }
    /**
     * Return current selected HTML
     * @example
     * ```javascript
     * const editor = Jodit.make();
     * console.log(editor.s.html); // html
     * console.log(Jodit.modules.Helpers.stripTags(editor.s.html)); // plain text
     * ```
     */
    get html() {
        const sel = this.sel;
        if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            const clonedSelection = range.cloneContents();
            const div = this.j.createInside.div();
            div.appendChild(clonedSelection);
            return div.innerHTML;
        }
        return '';
    }
    /**
     * Wrap all selected fragments inside Tag or apply some callback
     */
    *wrapInTagGen(fakes) {
        if (this.isCollapsed()) {
            const font = this.jodit.createInside.element('font', INVISIBLE_SPACE);
            this.insertNode(font, false, false);
            if (fakes && fakes[0]) {
                font.appendChild(fakes[0]);
            }
            yield font;
            Dom.unwrap(font);
            return;
        }
        // fix issue https://github.com/xdan/jodit/issues/65
        $$('*[style*=font-size]', this.area).forEach(elm => {
            attr(elm, 'data-font-size', elm.style.fontSize.toString());
            elm.style.removeProperty('font-size');
        });
        this.j.nativeExecCommand('fontsize', false, '7');
        $$('*[data-font-size]', this.area).forEach(elm => {
            const fontSize = attr(elm, 'data-font-size');
            if (fontSize) {
                elm.style.fontSize = fontSize;
                attr(elm, 'data-font-size', null);
            }
        });
        const elms = $$('font[size="7"]', this.area);
        for (const font of elms) {
            const { firstChild, lastChild } = font;
            if (firstChild &&
                firstChild === lastChild &&
                isMarker(firstChild)) {
                Dom.unwrap(font);
                continue;
            }
            if (firstChild && isMarker(firstChild)) {
                Dom.before(font, firstChild);
            }
            if (lastChild && isMarker(lastChild)) {
                Dom.after(font, lastChild);
            }
            yield font;
            Dom.unwrap(font);
        }
        return;
    }
    /**
     * Wrap all selected fragments inside Tag or apply some callback
     */
    wrapInTag(tagOrCallback) {
        const result = [];
        for (const font of this.wrapInTagGen()) {
            try {
                if (font.firstChild &&
                    font.firstChild === font.lastChild &&
                    isMarker(font.firstChild)) {
                    continue;
                }
                if (isFunction(tagOrCallback)) {
                    tagOrCallback(font);
                }
                else {
                    result.push(Dom.replace(font, tagOrCallback, this.j.createInside));
                }
            }
            finally {
                const pn = font.parentNode;
                if (pn) {
                    Dom.unwrap(font);
                    if (Dom.isEmpty(pn)) {
                        Dom.unwrap(pn);
                    }
                }
            }
        }
        return result;
    }
    /**
     * Apply some css rules for all selections. It method wraps selections in nodeName tag.
     * @example
     * ```js
     * const editor = Jodit.make('#editor');
     * editor.value = 'test';
     * editor.execCommand('selectall');
     *
     * editor.s.commitStyle({
     * 	style: {color: 'red'}
     * }) // will wrap `text` in `span` and add style `color:red`
     * editor.s.commitStyle({
     * 	style: {color: 'red'}
     * }) // will remove `color:red` from `span`
     * ```
     */
    commitStyle(options) {
        assert(size(options) > 0, 'Need to pass at least one option');
        const styleElm = new CommitStyle(options);
        styleElm.apply(this.j);
    }
    /**
     * Split selection on two parts: left and right
     */
    splitSelection(currentBox, edge) {
        if (!this.isCollapsed()) {
            return null;
        }
        const leftRange = this.createRange();
        const range = this.range;
        leftRange.setStartBefore(currentBox);
        const cursorOnTheRight = this.cursorOnTheRight(currentBox, edge);
        const cursorOnTheLeft = this.cursorOnTheLeft(currentBox, edge);
        const br = this.j.createInside.element('br'), prevFake = this.j.createInside.fake(), nextFake = prevFake.cloneNode();
        try {
            if (cursorOnTheRight || cursorOnTheLeft) {
                if (edge) {
                    Dom.before(edge, br);
                }
                else {
                    Dom.safeInsertNode(range, br);
                }
                const clearBR = (start, getNext) => {
                    let next = getNext(start);
                    while (next) {
                        const nextSib = getNext(next);
                        if (next &&
                            (Dom.isTag(next, 'br') || Dom.isEmptyTextNode(next))) {
                            Dom.safeRemove(next);
                        }
                        else {
                            break;
                        }
                        next = nextSib;
                    }
                };
                clearBR(br, (n) => n.nextSibling);
                clearBR(br, (n) => n.previousSibling);
                Dom.after(br, nextFake);
                Dom.before(br, prevFake);
                if (cursorOnTheRight) {
                    leftRange.setEndBefore(br);
                    range.setEndBefore(br);
                }
                else {
                    leftRange.setEndAfter(br);
                    range.setEndAfter(br);
                }
            }
            else {
                leftRange.setEnd(range.startContainer, range.startOffset);
            }
            const fragment = leftRange.extractContents();
            const clearEmpties = (node) => Dom.each(node, node => Dom.isEmptyTextNode(node) && Dom.safeRemove(node));
            assert(currentBox.parentNode, 'Splitting fails');
            try {
                clearEmpties(fragment);
                clearEmpties(currentBox);
                currentBox.parentNode.insertBefore(fragment, currentBox);
                if (!edge && cursorOnTheRight && br?.parentNode) {
                    const range = this.createRange();
                    range.setStartBefore(br);
                    this.selectRange(range);
                }
            }
            catch (e) {
                if (!IS_PROD) {
                    throw e;
                }
            }
            // After splitting some part can be empty
            const fillFakeParent = (fake) => {
                if (fake?.parentNode?.firstChild === fake?.parentNode?.lastChild) {
                    fake?.parentNode?.appendChild(br.cloneNode());
                }
            };
            fillFakeParent(prevFake);
            fillFakeParent(nextFake);
        }
        finally {
            Dom.safeRemove(prevFake);
            Dom.safeRemove(nextFake);
        }
        return currentBox.previousElementSibling;
    }
    expandSelection() {
        if (this.isCollapsed()) {
            return this;
        }
        const { range } = this;
        const c = range.cloneRange();
        if (!Dom.isOrContains(this.j.editor, range.commonAncestorContainer, true)) {
            return this;
        }
        const moveMaxEdgeFake = (start) => {
            const fake = this.j.createInside.fake();
            const r = range.cloneRange();
            r.collapse(start);
            Dom.safeInsertNode(r, fake);
            moveTheNodeAlongTheEdgeOutward(fake, start, this.j.editor);
            return fake;
        };
        const leftFake = moveMaxEdgeFake(true);
        const rightFake = moveMaxEdgeFake(false);
        c.setStartAfter(leftFake);
        c.setEndBefore(rightFake);
        const leftBox = Dom.findSibling(leftFake, false);
        const rightBox = Dom.findSibling(rightFake, true);
        if (leftBox !== rightBox) {
            const rightInsideLeft = Dom.isElement(leftBox) && Dom.isOrContains(leftBox, rightFake);
            const leftInsideRight = !rightInsideLeft &&
                Dom.isElement(rightBox) &&
                Dom.isOrContains(rightBox, leftFake);
            if (rightInsideLeft || leftInsideRight) {
                let child = (rightInsideLeft ? leftBox : rightBox), container = child;
                while (Dom.isElement(child)) {
                    child = rightInsideLeft
                        ? child.firstElementChild
                        : child.lastElementChild;
                    if (child) {
                        const isInside = rightInsideLeft
                            ? Dom.isOrContains(child, rightFake)
                            : Dom.isOrContains(child, leftFake);
                        if (isInside) {
                            container = child;
                        }
                    }
                }
                if (rightInsideLeft) {
                    c.setStart(container, 0);
                }
                else {
                    c.setEnd(container, container.childNodes.length);
                }
            }
        }
        this.selectRange(c);
        Dom.safeRemove(leftFake, rightFake);
        if (this.isCollapsed()) {
            throw error('Selection is collapsed');
        }
        return this;
    }
}
__decorate([
    autobind
], Selection.prototype, "createRange", null);
__decorate([
    autobind
], Selection.prototype, "focus", null);
__decorate([
    autobind
], Selection.prototype, "setCursorAfter", null);
__decorate([
    autobind
], Selection.prototype, "setCursorBefore", null);
__decorate([
    autobind
], Selection.prototype, "setCursorIn", null);
