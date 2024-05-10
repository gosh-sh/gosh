/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { LIST_TAGS } from "../../../core/constants.js";
import { Dom } from "../../../core/dom/dom.js";
import { getMoveFilter } from "../helpers.js";
/**
 * Check if two separate elements can be connected
 * @private
 */
export function checkJoinNeighbors(jodit, fakeNode, backspace) {
    let nextBox = fakeNode, mainClosestBox = nextBox;
    // Find the main big closest element
    while (nextBox &&
        !Dom.findNotEmptySibling(nextBox, backspace) &&
        nextBox.parentElement !== jodit.editor) {
        nextBox = nextBox.parentElement;
        mainClosestBox = nextBox;
    }
    if (Dom.isElement(mainClosestBox) &&
        Dom.isContentEditable(mainClosestBox, jodit.editor)) {
        const sibling = Dom.findNotEmptySibling(mainClosestBox, backspace);
        if (sibling &&
            (checkMoveListContent(jodit, mainClosestBox, sibling, backspace) ||
                moveContentAndRemoveEmpty(jodit, mainClosestBox, sibling, backspace))) {
            jodit.s.setCursorBefore(fakeNode);
            return true;
        }
    }
    return false;
}
function checkMoveListContent(jodit, mainClosestBox, sibling, backspace) {
    // Process UL/LI/OL cases
    const siblingIsList = Dom.isTag(sibling, LIST_TAGS);
    const boxIsList = Dom.isTag(mainClosestBox, LIST_TAGS);
    const elementChild = (elm, side) => side ? elm.firstElementChild : elm.lastElementChild;
    if (boxIsList) {
        sibling = jodit.createInside.element(jodit.o.enterBlock);
        Dom.before(mainClosestBox, sibling);
        return moveContentAndRemoveEmpty(jodit, elementChild(mainClosestBox, backspace), sibling, backspace);
    }
    if (sibling && siblingIsList && !boxIsList) {
        return moveContentAndRemoveEmpty(jodit, mainClosestBox, elementChild(sibling, !backspace), backspace);
    }
    return false;
}
function moveContentAndRemoveEmpty(jodit, mainClosestBox, sibling, backspace) {
    // Move content and remove empty nodes
    if (mainClosestBox && Dom.isElement(sibling)) {
        Dom.moveContent(mainClosestBox, sibling, !backspace, getMoveFilter(jodit));
        let remove = mainClosestBox;
        while (remove && remove !== jodit.editor && Dom.isEmpty(remove)) {
            const parent = remove.parentElement;
            Dom.safeRemove(remove);
            remove = parent;
        }
        return true;
    }
    return false;
}
