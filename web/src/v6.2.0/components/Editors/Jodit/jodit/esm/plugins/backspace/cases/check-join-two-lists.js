/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../../core/dom/dom.js";
import { call } from "../../../core/helpers/utils/utils.js";
import { getMoveFilter } from "../helpers.js";
/**
 * Try join two UL elements
 *
 * @example
 * ```html
 * <ul><li>one</li></ul>|<ol><li>two</li></ol>
 * ```
 * Result
 * ```html
 * <ul><li>one|</li><li>two</li></ul>
 * ```
 * @private
 */
export function checkJoinTwoLists(jodit, fakeNode, backspace) {
    const next = Dom.findSibling(fakeNode, backspace), prev = Dom.findSibling(fakeNode, !backspace);
    if (!Dom.closest(fakeNode, Dom.isElement, jodit.editor) &&
        Dom.isList(next) &&
        Dom.isList(prev) &&
        Dom.isTag(next.lastElementChild, 'li') &&
        Dom.isTag(prev.firstElementChild, 'li')) {
        const { setCursorBefore, setCursorAfter } = jodit.s;
        const target = next.lastElementChild, second = prev.firstElementChild;
        call(!backspace ? Dom.append : Dom.prepend, second, fakeNode);
        Dom.moveContent(prev, next, !backspace, getMoveFilter(jodit));
        Dom.safeRemove(prev);
        call(backspace ? Dom.append : Dom.prepend, target, fakeNode);
        call(backspace ? setCursorBefore : setCursorAfter, fakeNode);
        return true;
    }
    return false;
}
