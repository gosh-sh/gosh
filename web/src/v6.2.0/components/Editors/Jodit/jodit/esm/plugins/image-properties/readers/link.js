/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../../core/dom/dom.js";
import { attr } from "../../../core/helpers/utils/attr.js";
/** @private */
export function readLink(state, j, values) {
    const a = Dom.closest(state.sourceImage, 'a', j.editor);
    if (a) {
        values.imageLink = attr(a, 'href') || '';
        values.imageLinkOpenInNewTab = attr(a, 'target') === '_blank';
    }
    else {
        values.imageLink = '';
        values.imageLinkOpenInNewTab = false;
    }
}
