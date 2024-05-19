/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../../core/dom/dom.js";
import { assert } from "../../../core/helpers/utils/assert.js";
/**
 * Checks if the cursor is at the beginning of the LI element when tabbed.
 * If so then add an internal list
 * @private
 */
export function onTabInsideLi(jodit, shift = false) {
    if (!jodit.o.tab.tabInsideLiInsertNewList) {
        return false;
    }
    const [fake, fake2] = fakeCursors(jodit);
    try {
        const li = getParentLeaf(jodit, fake, shift);
        if (!li) {
            return false;
        }
        if (!isSameLeftCursorPosition(li, jodit, fake)) {
            return false;
        }
        const list = Dom.closest(li, ['ol', 'ul'], jodit.editor);
        if (!list || (shift && !Dom.closest(list, 'li', jodit.editor))) {
            return false;
        }
        if (!shift) {
            appendNestedList(jodit, list, li);
        }
        else {
            removeNestedList(jodit, list, li);
        }
        return true;
    }
    finally {
        const range = jodit.s.createRange();
        range.setStartAfter(fake);
        range.setEndBefore(fake2);
        jodit.s.selectRange(range);
        Dom.safeRemove(fake);
        Dom.safeRemove(fake2);
    }
    return false;
}
function fakeCursors(jodit) {
    const fake = jodit.createInside.fake();
    const fake2 = jodit.createInside.fake();
    const r = jodit.s.range.cloneRange();
    r.collapse(true);
    r.insertNode(fake);
    const r2 = jodit.s.range.cloneRange();
    r2.collapse(false);
    r2.insertNode(fake2);
    return [fake, fake2];
}
function getParentLeaf(jodit, fake, shift) {
    const li = Dom.closest(fake, 'li', jodit.editor);
    if (!li) {
        return false;
    }
    if (!shift && !Dom.isLeaf(li.previousElementSibling)) {
        return false;
    }
    if (shift && !Dom.closest(li, 'li', jodit.editor)) {
        return false;
    }
    return li;
}
function isSameLeftCursorPosition(li, jodit, fake) {
    const li2 = Dom.closest(fake, 'li', jodit.editor);
    return !(!li2 || (li2 !== li && !li.contains(li2)));
}
function appendNestedList(jodit, list, li) {
    const previousLi = li.previousElementSibling;
    assert(previousLi, 'tab previousElementSibling is null');
    const lastElm = previousLi.lastElementChild;
    const newList = Dom.isTag(lastElm, list.tagName)
        ? lastElm
        : jodit.createInside.element(list.tagName, Array.from(list.attributes).reduce((acc, attr) => {
            acc[attr.name] = attr.value;
            return acc;
        }, {}));
    newList.appendChild(li);
    lastElm !== newList && previousLi.appendChild(newList);
}
function removeNestedList(jodit, list, li) {
    const parentLi = Dom.closest(list, 'li', jodit.editor);
    assert(parentLi, 'tab parentLi is null');
    const items = Array.from(list.children).filter(t => Dom.isLeaf(t));
    Dom.after(parentLi, li);
    const index = items.indexOf(li);
    if (index === 0 || items.length === 1) {
        Dom.safeRemove(list);
    }
    if (index !== items.length - 1) {
        const clone = list.cloneNode();
        Dom.append(li, clone);
        for (let i = index + 1; i < items.length; i += 1) {
            Dom.append(clone, items[i]);
        }
    }
}
