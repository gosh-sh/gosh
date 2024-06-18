/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { INSEPARABLE_TAGS } from "../../../../../core/constants.js";
import { Dom } from "../../../../../core/dom/dom.js";
/**
 * @private
 */
export function fillEmptyParagraph(jodit, nodeElm, hadEffect) {
    if (jodit.o.cleanHTML.fillEmptyParagraph &&
        Dom.isBlock(nodeElm) &&
        Dom.isEmpty(nodeElm, INSEPARABLE_TAGS)) {
        const br = jodit.createInside.element('br');
        nodeElm.appendChild(br);
        return true;
    }
    return hadEffect;
}
