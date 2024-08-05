/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { css } from "../../../core/helpers/utils/css.js";
/** @private */
export function readAlign(image, values) {
    // Align
    if (image.style.cssFloat &&
        ['left', 'right'].indexOf(image.style.cssFloat.toLowerCase()) !== -1) {
        values.align = css(image, 'float');
    }
    else {
        if (css(image, 'display') === 'block' &&
            image.style.marginLeft === 'auto' &&
            image.style.marginRight === 'auto') {
            values.align = 'center';
        }
        else {
            values.align = '';
        }
    }
}
