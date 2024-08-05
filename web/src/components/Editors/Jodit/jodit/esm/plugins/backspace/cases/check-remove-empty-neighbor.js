/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../../core/dom/dom.js";
/**
 * Check if it is possible to remove an empty adjacent element.
 *
 * @example
 * ```html
 * <p><br></p><p>|second stop</p>
 * ```
 * result
 * ```html
 * <p>|second stop</p>
 * ```
 * @private
 */
export function checkRemoveEmptyNeighbor(jodit, fakeNode, backspace) {
    const parent = Dom.closest(fakeNode, Dom.isElement, jodit.editor);
    if (!parent) {
        return false;
    }
    const neighbor = Dom.findNotEmptySibling(parent, backspace);
    if (neighbor && Dom.isEmpty(neighbor)) {
        Dom.safeRemove(neighbor);
        jodit.s.setCursorBefore(fakeNode);
        return true;
    }
    return false;
}
