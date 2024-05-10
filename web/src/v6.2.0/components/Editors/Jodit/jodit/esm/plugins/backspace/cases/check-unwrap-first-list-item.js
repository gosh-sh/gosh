/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../../core/dom/dom.js";
import { call } from "../../../core/helpers/utils/index.js";
/**
 * For the first item in a list on backspace, try to move his content in new P
 *
 * @example
 * ```html
 * <ul><li>|first</li><li>second</li></ul>
 * ```
 * Result
 * ```html
 * <p>|first</p><ul><li>second</li></ul>
 * ```
 *
 * @private
 */
export function checkUnwrapFirstListItem(jodit, fakeNode, backspace) {
    const li = Dom.closest(fakeNode, Dom.isElement, jodit.editor);
    const { s } = jodit;
    if (Dom.isLeaf(li) &&
        li?.parentElement?.[backspace ? 'firstElementChild' : 'lastElementChild'] === li &&
        s.cursorInTheEdge(backspace, li)) {
        const ul = li.parentElement;
        const p = jodit.createInside.element(jodit.o.enterBlock);
        call(backspace ? Dom.before : Dom.after, ul, p);
        Dom.moveContent(li, p);
        Dom.safeRemove(li);
        if (Dom.isEmpty(ul)) {
            Dom.safeRemove(ul);
        }
        call(backspace ? s.setCursorBefore : s.setCursorAfter, fakeNode);
        return true;
    }
    return false;
}
