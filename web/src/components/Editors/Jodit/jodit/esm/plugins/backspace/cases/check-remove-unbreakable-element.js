/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { INSEPARABLE_TAGS } from "../../../core/constants.js";
import { Dom } from "../../../core/dom/dom.js";
import { checkRemoveEmptyParent } from "./check-remove-empty-parent.js";
/**
 * Check possibility inseparable Element can be removed (img, hr etc.)
 *
 * @example
 * ```html
 * <p>first second <img>| stop</p>
 * ```
 * result
 * ```html
 * <p>first second | stop</p>
 * ```
 *
 * @private
 */
export function checkRemoveUnbreakableElement(jodit, fakeNode, backspace) {
    const neighbor = Dom.findSibling(fakeNode, backspace);
    if (Dom.isElement(neighbor) &&
        (Dom.isTag(neighbor, INSEPARABLE_TAGS) || Dom.isEmpty(neighbor))) {
        Dom.safeRemove(neighbor);
        if (Dom.isTag(neighbor, 'br') &&
            !Dom.findNotEmptySibling(fakeNode, false)) {
            Dom.after(fakeNode, jodit.createInside.element('br'));
        }
        jodit.s.setCursorBefore(fakeNode);
        if (Dom.isTag(neighbor, 'br')) {
            checkRemoveEmptyParent(jodit, fakeNode, backspace);
        }
        return true;
    }
    return false;
}
