/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { BR } from "../../../core/constants.js";
import { Dom } from "../../../core/dom/dom.js";
import { scrollIntoViewIfNeeded } from "../../../core/helpers/utils/scroll-into-view.js";
/**
 * Checks the possibility and necessity of inserting a BR instead of a block
 * @private
 */
export function checkBR(fake, jodit, shiftKeyPressed) {
    const isMultiLineBlock = Boolean(Dom.closest(fake, ['pre', 'blockquote'], jodit.editor));
    const isBRMode = jodit.o.enter.toLowerCase() === BR.toLowerCase();
    // if you use <br> defaultTag for break line or when was entered SHIFt key or in <td> or <th> or <blockquote>
    if (isBRMode ||
        (shiftKeyPressed && !isMultiLineBlock) ||
        (!shiftKeyPressed && isMultiLineBlock)) {
        // 2 BR before
        if (isMultiLineBlock && checkSeveralBR(fake)) {
            return false;
        }
        const br = jodit.createInside.element('br');
        Dom.before(fake, br);
        if (!Dom.findNotEmptySibling(br, false)) {
            const clone = br.cloneNode();
            Dom.after(br, clone);
            Dom.before(clone, fake);
        }
        scrollIntoViewIfNeeded(br, jodit.editor, jodit.ed);
        return true;
    }
    return false;
}
function checkSeveralBR(fake) {
    // 2 BR before
    const preBr = brBefore(brBefore(fake));
    if (preBr) {
        Dom.safeRemove(brBefore(fake));
        Dom.safeRemove(preBr);
        return true;
    }
    return false;
}
function brBefore(start) {
    if (!start) {
        return false;
    }
    const prev = Dom.findSibling(start, true);
    if (!prev || !Dom.isTag(prev, 'br')) {
        return false;
    }
    return prev;
}
