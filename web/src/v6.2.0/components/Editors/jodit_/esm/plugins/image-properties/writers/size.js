/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { isNumeric } from "../../../core/helpers/checker/is-numeric.js";
import { attr } from "../../../core/helpers/utils/attr.js";
import { css } from "../../../core/helpers/utils/css.js";
import { normalSizeToString } from "../utils/utils.js";
/** @private */
export function applySize(image, imageWidth, imageHeight, sizeIsLocked) {
    // Size
    if (imageWidth !== image.offsetWidth ||
        imageHeight !== image.offsetHeight) {
        const updatedWidth = imageWidth ? normalSizeToString(imageWidth) : null;
        let updatedHeight = imageHeight
            ? normalSizeToString(imageHeight)
            : null;
        css(image, {
            width: updatedWidth,
            height: updatedWidth && sizeIsLocked ? null : updatedHeight
        });
        attr(image, 'width', updatedWidth && isNumeric(imageWidth) && attr(image, 'width')
            ? updatedWidth
            : null);
        if (!attr(image, 'width') || sizeIsLocked) {
            updatedHeight = null;
        }
        attr(image, 'height', updatedHeight);
    }
}
