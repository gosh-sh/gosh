/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../../core/dom/dom.js";
/**
 * Inside quote/tables cell, etc. you can't split so just add br
 * @private
 */
export function checkUnsplittableBox(fake, jodit, currentBox) {
    if (!Dom.canSplitBlock(currentBox)) {
        Dom.before(fake, jodit.createInside.element('br'));
        return false;
    }
    return true;
}
