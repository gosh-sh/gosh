/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { isJoditObject } from "../checker/is-jodit-object.js";
/**
 * Calculate screen element position
 */
export function position(elm, jodit, recurse = false) {
    const rect = elm.getBoundingClientRect();
    let xPos = rect.left, yPos = rect.top;
    if (isJoditObject(jodit) &&
        jodit.iframe &&
        jodit.ed.body.contains(elm) &&
        !recurse) {
        const { left, top } = position(jodit.iframe, jodit, true);
        xPos += left;
        yPos += top;
    }
    return {
        left: Math.round(xPos),
        top: Math.round(yPos),
        width: Math.round(elm.offsetWidth ?? rect.width),
        height: Math.round(elm.offsetHeight ?? rect.height)
    };
}
