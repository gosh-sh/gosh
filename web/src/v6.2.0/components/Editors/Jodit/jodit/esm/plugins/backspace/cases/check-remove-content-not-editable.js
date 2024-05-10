/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../../core/dom/index.js";
import { call } from "../../../core/helpers/index.js";
import { moveNodeInsideStart } from "../../../core/selection/helpers/index.js";
/**
 * Checks if a non-editable element can be deleted
 * @private
 */
export function checkRemoveContentNotEditable(jodit, fakeNode, backspace) {
    let neighbor = Dom.findSibling(fakeNode, backspace);
    if (!neighbor &&
        fakeNode.parentElement &&
        fakeNode.parentElement !== jodit.editor) {
        neighbor = Dom.findSibling(fakeNode.parentElement, backspace);
    }
    if (Dom.isElement(neighbor) &&
        !Dom.isContentEditable(neighbor, jodit.editor)) {
        call(backspace ? Dom.before : Dom.after, neighbor, fakeNode);
        Dom.safeRemove(neighbor);
        moveNodeInsideStart(jodit, fakeNode, backspace);
        call(backspace ? jodit.s.setCursorBefore : jodit.s.setCursorAfter, fakeNode);
        return true;
    }
    return false;
}
