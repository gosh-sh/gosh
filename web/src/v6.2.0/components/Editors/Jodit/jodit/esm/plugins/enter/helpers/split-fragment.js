/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../../core/dom/dom.js";
import { scrollIntoViewIfNeeded } from "../../../core/helpers/utils/scroll-into-view.js";
import { insertParagraph } from "./insert-paragraph.js";
/**
 * Splits a block element into two parts
 * and adds a new default block in the middle/start/end
 * @private
 */
export function splitFragment(fake, jodit, block) {
    const sel = jodit.s, { enter } = jodit.o;
    const defaultTag = enter.toLowerCase();
    const isLi = Dom.isLeaf(block);
    const canSplit = block.tagName.toLowerCase() === defaultTag || isLi;
    const cursorOnTheRight = sel.cursorOnTheRight(block, fake);
    const cursorOnTheLeft = sel.cursorOnTheLeft(block, fake);
    if (!canSplit && (cursorOnTheRight || cursorOnTheLeft)) {
        if (cursorOnTheRight) {
            Dom.after(block, fake);
        }
        else {
            Dom.before(block, fake);
        }
        insertParagraph(fake, jodit, defaultTag);
        if (cursorOnTheLeft && !cursorOnTheRight) {
            Dom.prepend(block, fake);
        }
        return;
    }
    const newP = sel.splitSelection(block, fake);
    scrollIntoViewIfNeeded(newP, jodit.editor, jodit.ed);
}
