/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import * as consts from "../constants.js";
import { INSEPARABLE_TAGS, LIST_TAGS, NO_EMPTY_TAGS, TEMP_ATTR } from "../constants.js";
import { toArray } from "../helpers/array/to-array.js";
import { isArray, isFunction, isHTML, isMarker, isSet, isString, isVoid } from "../helpers/checker/index.js";
import { trim } from "../helpers/string/trim.js";
import { $$, attr, call, css, dataBind, error } from "../helpers/utils/index.js";
/**
 * Module for working with DOM
 */
export class Dom {
    constructor() {
        throw new Error('Dom is static module');
    }
    /**
     * Remove all content from element
     */
    static detach(node) {
        while (node && node.firstChild) {
            node.removeChild(node.firstChild);
        }
    }
    /**
     * Wrap all inline siblings
     */
    static wrapInline(current, tag, editor) {
        let tmp, first = current, last = current;
        editor.s.save();
        let needFindNext = false;
        do {
            needFindNext = false;
            tmp = first.previousSibling;
            if (tmp && !Dom.isBlock(tmp)) {
                needFindNext = true;
                first = tmp;
            }
        } while (needFindNext);
        do {
            needFindNext = false;
            tmp = last.nextSibling;
            if (tmp && !Dom.isBlock(tmp)) {
                needFindNext = true;
                last = tmp;
            }
        } while (needFindNext);
        const wrapper = isString(tag) ? editor.createInside.element(tag) : tag;
        if (first.parentNode) {
            first.parentNode.insertBefore(wrapper, first);
        }
        let next = first;
        while (next) {
            next = first.nextSibling;
            wrapper.appendChild(first);
            if (first === last || !next) {
                break;
            }
            first = next;
        }
        editor.s.restore();
        return wrapper;
    }
    /**
     * Wrap node inside another node
     */
    static wrap(current, tag, create) {
        const wrapper = isString(tag) ? create.element(tag) : tag;
        if (Dom.isNode(current)) {
            if (!current.parentNode) {
                throw error('Element should be in DOM');
            }
            current.parentNode.insertBefore(wrapper, current);
            wrapper.appendChild(current);
        }
        else {
            const fragment = current.extractContents();
            current.insertNode(wrapper);
            wrapper.appendChild(fragment);
        }
        return wrapper;
    }
    /**
     * Remove parent of node and insert this node instead that parent
     */
    static unwrap(node) {
        const parent = node.parentNode;
        if (parent) {
            while (node.firstChild) {
                parent.insertBefore(node.firstChild, node);
            }
            Dom.safeRemove(node);
        }
    }
    /**
     * Call functions for all nodes between `start` and `end`
     */
    static between(start, end, callback) {
        let next = start;
        while (next && next !== end) {
            if (start !== next && callback(next)) {
                break;
            }
            let step = next.firstChild || next.nextSibling;
            if (!step) {
                while (next && !next.nextSibling) {
                    next = next.parentNode;
                }
                step = next?.nextSibling;
            }
            next = step;
        }
    }
    static replace(elm, newTagName, create, withAttributes = false, notMoveContent = false) {
        if (isHTML(newTagName)) {
            newTagName = create.fromHTML(newTagName);
        }
        const tag = isString(newTagName)
            ? create.element(newTagName)
            : newTagName;
        if (!notMoveContent) {
            while (elm.firstChild) {
                tag.appendChild(elm.firstChild);
            }
        }
        if (withAttributes && Dom.isElement(elm) && Dom.isElement(tag)) {
            toArray(elm.attributes).forEach(attr => {
                tag.setAttribute(attr.name, attr.value);
            });
        }
        if (elm.parentNode) {
            elm.parentNode.replaceChild(tag, elm);
        }
        return tag;
    }
    /**
     * Checks whether the Node text and blank (in this case it may contain invisible auxiliary characters ,
     * it is also empty )
     *
     * @param node - The element of wood to be checked
     */
    static isEmptyTextNode(node) {
        return (Dom.isText(node) &&
            (!node.nodeValue ||
                node.nodeValue
                    .replace(consts.INVISIBLE_SPACE_REG_EXP(), '')
                    .trim().length === 0));
    }
    static isEmptyContent(node) {
        return Dom.each(node, (elm) => Dom.isEmptyTextNode(elm));
    }
    /**
     * The node is editable
     */
    static isContentEditable(node, root) {
        return (Dom.isNode(node) &&
            !Dom.closest(node, elm => Dom.isElement(elm) &&
                elm.getAttribute('contenteditable') === 'false', root));
    }
    static isEmpty(node, condNoEmptyElement = NO_EMPTY_TAGS) {
        if (!node) {
            return true;
        }
        let cond;
        if (!isFunction(condNoEmptyElement)) {
            cond = (elm) => condNoEmptyElement.has(elm.nodeName.toLowerCase());
        }
        else {
            cond = condNoEmptyElement;
        }
        const emptyText = (node) => node.nodeValue == null || trim(node.nodeValue).length === 0;
        if (Dom.isText(node)) {
            return emptyText(node);
        }
        return (!(Dom.isElement(node) && cond(node)) &&
            Dom.each(node, (elm) => {
                if ((Dom.isText(elm) && !emptyText(elm)) ||
                    (Dom.isElement(elm) && cond(elm))) {
                    return false;
                }
            }));
    }
    /**
     * Returns true if it is a DOM node
     */
    static isNode(object) {
        // Duck-typing
        return Boolean(object &&
            isString(object.nodeName) &&
            typeof object.nodeType === 'number' &&
            object.childNodes &&
            isFunction(object.appendChild));
    }
    /**
     *  Check if element is table cell
     */
    static isCell(elm) {
        return (Dom.isNode(elm) && (elm.nodeName === 'TD' || elm.nodeName === 'TH'));
    }
    /**
     * Check if element is a list	element UL or OL
     */
    static isList(elm) {
        return Dom.isTag(elm, LIST_TAGS);
    }
    /**
     * Check if element is a part of list	element LI
     */
    static isLeaf(elm) {
        return Dom.isTag(elm, 'li');
    }
    /**
     * Check is element is Image element
     */
    static isImage(elm) {
        return (Dom.isNode(elm) && /^(img|svg|picture|canvas)$/i.test(elm.nodeName));
    }
    /**
     * Check the `node` is a block element
     * @param node - Object to check
     */
    static isBlock(node) {
        return (!isVoid(node) &&
            typeof node === 'object' &&
            Dom.isNode(node) &&
            consts.IS_BLOCK.test(node.nodeName));
    }
    /**
     * Check if element is text node
     */
    static isText(node) {
        return Boolean(node && node.nodeType === Node.TEXT_NODE);
    }
    /**
     * Check if element is comment node
     */
    static isComment(node) {
        return Boolean(node && node.nodeType === Node.COMMENT_NODE);
    }
    /**
     * Check if element is element node
     */
    static isElement(node) {
        if (!Dom.isNode(node)) {
            return false;
        }
        const win = node.ownerDocument?.defaultView;
        return Boolean(win && node.nodeType === Node.ELEMENT_NODE);
    }
    /**
     * Check if element is document fragment
     */
    static isFragment(node) {
        if (!Dom.isNode(node)) {
            return false;
        }
        const win = node.ownerDocument?.defaultView;
        return Boolean(win && node.nodeType === Node.DOCUMENT_FRAGMENT_NODE);
    }
    /**
     * Check if element is HTMLElement node
     */
    static isHTMLElement(node) {
        if (!Dom.isNode(node)) {
            return false;
        }
        const win = node.ownerDocument?.defaultView;
        return Boolean(win && node instanceof win.HTMLElement);
    }
    /**
     * Check element is inline block
     */
    static isInlineBlock(node) {
        return (Dom.isElement(node) &&
            !/^(BR|HR)$/i.test(node.tagName) &&
            ['inline', 'inline-block'].indexOf(css(node, 'display').toString()) !== -1);
    }
    /**
     * It's block and it can be split
     */
    static canSplitBlock(node) {
        return (!isVoid(node) &&
            Dom.isHTMLElement(node) &&
            Dom.isBlock(node) &&
            !/^(TD|TH|CAPTION|FORM)$/.test(node.nodeName) &&
            node.style !== undefined &&
            !/^(fixed|absolute)/i.test(node.style.position));
    }
    /**
     * Get last matched node inside root
     */
    static last(root, condition) {
        let last = root?.lastChild;
        if (!last) {
            return null;
        }
        do {
            if (condition(last)) {
                return last;
            }
            let next = last.lastChild;
            if (!next) {
                next = last.previousSibling;
            }
            if (!next && last.parentNode !== root) {
                do {
                    last = last.parentNode;
                } while (last &&
                    !last?.previousSibling &&
                    last.parentNode !== root);
                next = last?.previousSibling;
            }
            last = next;
        } while (last);
        return null;
    }
    /**
     * Find previous node
     */
    static prev(node, condition, root, withChild = true) {
        return Dom.find(node, condition, root, false, withChild);
    }
    /**
     * Find next node what `condition(next) === true`
     */
    static next(node, condition, root, withChild = true) {
        return Dom.find(node, condition, root, true, withChild);
    }
    static prevWithClass(node, className) {
        return Dom.prev(node, node => {
            return (Dom.isElement(node) && node.classList.contains(className));
        }, node.parentNode);
    }
    static nextWithClass(node, className) {
        return Dom.next(node, elm => Dom.isElement(elm) && elm.classList.contains(className), node.parentNode);
    }
    /**
     * Find next/prev node what `condition(next) === true`
     */
    static find(node, condition, root, leftToRight = true, withChild = true) {
        const gen = this.nextGen(node, root, leftToRight, withChild);
        let item = gen.next();
        while (!item.done) {
            if (condition(item.value)) {
                return item.value;
            }
            item = gen.next();
        }
        return null;
    }
    /**
     * Find next/prev node what `condition(next) === true`
     */
    static *nextGen(start, root, leftToRight = true, withChild = true) {
        const stack = [];
        let currentNode = start;
        do {
            let next = leftToRight
                ? currentNode.nextSibling
                : currentNode.previousSibling;
            while (next) {
                stack.unshift(next);
                next = leftToRight ? next.nextSibling : next.previousSibling;
            }
            yield* this.runInStack(start, stack, leftToRight, withChild);
            currentNode = currentNode.parentNode;
        } while (currentNode && currentNode !== root);
        return null;
    }
    /**
     * It goes through all the internal elements of the node, causing a callback function
     *
     * @param elm - the element whose children and descendants you want to iterate over
     * @param callback - It called for each item found
     * @example
     * ```javascript
     * Jodit.modules.Dom.each(editor.s.current(), function (node) {
     *  if (node.nodeType === Node.TEXT_NODE) {
     *      node.nodeValue = node.nodeValue.replace(Jodit.INVISIBLE_SPACE_REG_EX, '') // remove all of the text element codes invisible character
     *  }
     * });
     * ```
     */
    static each(elm, callback, leftToRight = true) {
        const gen = this.eachGen(elm, leftToRight);
        let item = gen.next();
        while (!item.done) {
            if (callback(item.value) === false) {
                return false;
            }
            item = gen.next();
        }
        return true;
    }
    static eachGen(root, leftToRight = true) {
        return this.runInStack(root, [root], leftToRight);
    }
    static *runInStack(start, stack, leftToRight, withChild = true) {
        while (stack.length) {
            const item = stack.pop();
            if (withChild) {
                let child = leftToRight ? item.lastChild : item.firstChild;
                while (child) {
                    stack.push(child);
                    child = leftToRight
                        ? child.previousSibling
                        : child.nextSibling;
                }
            }
            if (start !== item) {
                yield item;
            }
        }
    }
    /**
     * Find next/prev node what `condition(next) === true`
     */
    static findWithCurrent(node, condition, root, sibling = 'nextSibling', child = 'firstChild') {
        let next = node;
        do {
            if (condition(next)) {
                return next || null;
            }
            if (child && next && next[child]) {
                const nextOne = Dom.findWithCurrent(next[child], condition, next, sibling, child);
                if (nextOne) {
                    return nextOne;
                }
            }
            while (next && !next[sibling] && next !== root) {
                next = next.parentNode;
            }
            if (next && next[sibling] && next !== root) {
                next = next[sibling];
            }
        } while (next && next !== root);
        return null;
    }
    /**
     * Get not empty sibling
     */
    static findSibling(node, left = true, cond = (n) => !Dom.isEmptyTextNode(n)) {
        let sibling = Dom.sibling(node, left);
        while (sibling && !cond(sibling)) {
            sibling = Dom.sibling(sibling, left);
        }
        return sibling && cond(sibling) ? sibling : null;
    }
    /**
     * Returns the nearest non-empty sibling
     */
    static findNotEmptySibling(node, left) {
        return Dom.findSibling(node, left, n => {
            return (!Dom.isEmptyTextNode(n) &&
                Boolean(!Dom.isText(n) || (n.nodeValue?.length && trim(n.nodeValue))));
        });
    }
    /**
     * Returns the nearest non-empty neighbor
     */
    static findNotEmptyNeighbor(node, left, root) {
        return call(left ? Dom.prev : Dom.next, node, n => Boolean(n &&
            (!(Dom.isText(n) || Dom.isComment(n)) ||
                trim(n?.nodeValue || '').length)), root);
    }
    static sibling(node, left) {
        return left ? node.previousSibling : node.nextSibling;
    }
    /**
     * It goes through all the elements in ascending order, and checks to see if they meet the predetermined condition
     */
    static up(node, condition, root, checkRoot = false) {
        let start = node;
        if (!start) {
            return null;
        }
        do {
            if (condition(start)) {
                return start;
            }
            if (start === root || !start.parentNode) {
                break;
            }
            start = start.parentNode;
        } while (start && start !== root);
        if (start === root && checkRoot && condition(start)) {
            return start;
        }
        return null;
    }
    static closest(node, tagsOrCondition, root) {
        let condition;
        const lc = (s) => s.toLowerCase();
        if (isFunction(tagsOrCondition)) {
            condition = tagsOrCondition;
        }
        else if (isArray(tagsOrCondition) || isSet(tagsOrCondition)) {
            const set = isSet(tagsOrCondition)
                ? tagsOrCondition
                : new Set(tagsOrCondition.map(lc));
            condition = (tag) => Boolean(tag && set.has(lc(tag.nodeName)));
        }
        else {
            condition = (tag) => Boolean(tag && lc(tagsOrCondition) === lc(tag.nodeName));
        }
        return Dom.up(node, condition, root);
    }
    /**
     * Furthest parent node matching condition
     */
    static furthest(node, condition, root) {
        let matchedParent = null, current = node?.parentElement;
        while (current && current !== root) {
            if (condition(current)) {
                matchedParent = current;
            }
            current = current?.parentElement;
        }
        return matchedParent;
    }
    /**
     * Append new element in the start of root
     */
    static appendChildFirst(root, newElement) {
        const child = root.firstChild;
        if (child) {
            if (child !== newElement) {
                root.insertBefore(newElement, child);
            }
        }
        else {
            root.appendChild(newElement);
        }
    }
    /**
     * Insert newElement after element
     */
    static after(elm, newElement) {
        const { parentNode } = elm;
        if (!parentNode) {
            return;
        }
        if (parentNode.lastChild === elm) {
            parentNode.appendChild(newElement);
        }
        else {
            parentNode.insertBefore(newElement, elm.nextSibling);
        }
    }
    /**
     * Insert newElement before element
     */
    static before(elm, newElement) {
        const { parentNode } = elm;
        if (!parentNode) {
            return;
        }
        parentNode.insertBefore(newElement, elm);
    }
    /**
     * Insert newElement as first child inside element
     */
    static prepend(root, newElement) {
        root.insertBefore(newElement, root.firstChild);
    }
    static append(root, newElement) {
        if (isArray(newElement)) {
            newElement.forEach(node => {
                this.append(root, node);
            });
        }
        else {
            root.appendChild(newElement);
        }
    }
    /**
     * Move all content to another element
     */
    static moveContent(from, to, inStart = false, filter = () => true) {
        const fragment = (from.ownerDocument || document).createDocumentFragment();
        toArray(from.childNodes)
            .filter(elm => {
            if (filter(elm)) {
                return true;
            }
            Dom.safeRemove(elm);
            return false;
        })
            .forEach((node) => {
            fragment.appendChild(node);
        });
        if (!inStart || !to.firstChild) {
            to.appendChild(fragment);
        }
        else {
            to.insertBefore(fragment, to.firstChild);
        }
    }
    /**
     * Check root contains child or equal child
     */
    static isOrContains(root, child, onlyContains = false) {
        if (root === child) {
            return !onlyContains;
        }
        return Boolean(child && root && this.up(child, nd => nd === root, root, true));
    }
    /**
     * Safe remove element from DOM
     */
    static safeRemove(...nodes) {
        nodes.forEach(node => Dom.isNode(node) &&
            node.parentNode &&
            node.parentNode.removeChild(node));
    }
    static safeInsertNode(range, node) {
        range.collapsed || range.deleteContents();
        const child = Dom.isFragment(node) ? node.lastChild : node;
        if (range.startContainer === range.endContainer &&
            range.collapsed &&
            Dom.isTag(range.startContainer, INSEPARABLE_TAGS)) {
            Dom.after(range.startContainer, node);
        }
        else {
            range.insertNode(node);
            child && range.setStartBefore(child);
        }
        range.collapse(true);
        // https://developer.mozilla.org/en-US/docs/Web/API/Range/insertNode
        // if the new node is to be added to a text Node, that Node is split at the
        // insertion point, and the insertion occurs between the two text nodes.
        [node.nextSibling, node.previousSibling].forEach(n => Dom.isText(n) && !n.nodeValue && Dom.safeRemove(n));
    }
    /**
     * Hide element
     */
    static hide(node) {
        if (!node) {
            return;
        }
        dataBind(node, '__old_display', node.style.display);
        node.style.display = 'none';
    }
    /**
     * Show element
     */
    static show(node) {
        if (!node) {
            return;
        }
        const display = dataBind(node, '__old_display');
        if (node.style.display === 'none') {
            node.style.display = display || '';
        }
    }
    static isTag(node, tagNames) {
        if (!this.isElement(node)) {
            return false;
        }
        const nameL = node.tagName.toLowerCase();
        const nameU = node.tagName.toUpperCase();
        if (tagNames instanceof Set) {
            return tagNames.has(nameL) || tagNames.has(nameU);
        }
        if (Array.isArray(tagNames)) {
            throw new TypeError('Dom.isTag does not support array');
        }
        const tags = tagNames;
        if (nameL === tags || nameU === tags) {
            return true;
        }
        return false;
    }
    /**
     * Marks an item as temporary
     */
    static markTemporary(element, attributes) {
        attributes && attr(element, attributes);
        attr(element, TEMP_ATTR, true);
        return element;
    }
    /**
     * Check if element is temporary
     */
    static isTemporary(element) {
        if (!Dom.isElement(element)) {
            return false;
        }
        return isMarker(element) || attr(element, TEMP_ATTR) === 'true';
    }
    /**
     * Replace temporary elements from string
     */
    static replaceTemporaryFromString(value) {
        return value.replace(/<([a-z]+)[^>]+data-jodit-temp[^>]+>(.+?)<\/\1>/gi, '$2');
    }
    /**
     * Get temporary list
     */
    static temporaryList(root) {
        return $$(`[${TEMP_ATTR}]`, root);
    }
}
