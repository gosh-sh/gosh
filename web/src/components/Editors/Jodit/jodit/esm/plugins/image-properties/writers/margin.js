/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { css } from "../../../core/helpers/utils/css.js";
import { normalSizeToString } from "../utils/utils.js";
/** @private */
export function applyMargin(j, marginTop, marginRight, marginBottom, marginLeft, image, marginIsLocked) {
    const margins = [marginTop, marginRight, marginBottom, marginLeft];
    const applyMargin = (key, value) => {
        const oldValue = css(image, key);
        const v = normalSizeToString(value);
        if (oldValue.toString() !== v.toString()) {
            css(image, key, v);
        }
    };
    if (!marginIsLocked) {
        const sides = [
            'margin-top',
            'margin-right',
            'margin-bottom',
            'margin-left'
        ];
        margins.forEach((margin, index) => {
            const side = sides[index];
            applyMargin(side, margin);
        });
    }
    else {
        applyMargin('margin', marginTop);
    }
}
