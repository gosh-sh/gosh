/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../../core/dom/dom.js";
import { $$ } from "../../../core/helpers/utils/selector.js";
import { insertParagraph } from "./insert-paragraph.js";
/**
 * Handles pressing the Enter key inside an empty LI inside a list
 * @private
 */
export function processEmptyLILeaf(fake, jodit, li) {
    const list = Dom.closest(li, ['ol', 'ul'], jodit.editor);
    if (!list) {
        return;
    }
    const parentLi = list.parentElement, listInsideLeaf = Dom.isLeaf(parentLi);
    const container = listInsideLeaf ? parentLi : list;
    // Empty element in the middle of the list
    const leftRange = jodit.s.createRange();
    leftRange.setStartAfter(li);
    leftRange.setEndAfter(list);
    const rightPart = leftRange.extractContents();
    Dom.after(container, fake);
    Dom.safeRemove(li);
    if (!$$('li', list).length) {
        Dom.safeRemove(list);
    }
    const newLi = insertParagraph(fake, jodit, listInsideLeaf ? 'li' : jodit.o.enter);
    if (!rightPart.querySelector('li')) {
        return;
    }
    if (listInsideLeaf) {
        newLi.appendChild(rightPart);
    }
    else {
        Dom.after(newLi, rightPart);
    }
}
