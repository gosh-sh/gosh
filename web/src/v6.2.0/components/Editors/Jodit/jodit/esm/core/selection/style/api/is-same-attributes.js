/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { size } from "../../../helpers/size/object-size.js";
import { attr } from "../../../helpers/utils/index.js";
import { assert } from "../../../helpers/utils/assert.js";
import { hasSameStyle } from "./has-same-style.js";
/**
 * Compares whether the given attributes match the element's own attributes
 * @private
 */
export function isSameAttributes(elm, attrs) {
    if (!elm.attributes.length && !size(attrs)) {
        return true;
    }
    if (!size(attrs)) {
        return true;
    }
    assert(attrs, 'Attrs must be a non-empty object');
    return Object.keys(attrs).every(key => {
        if (key === 'class' || key === 'className') {
            return elm.classList.contains(attrs[key]);
        }
        if (key === 'style') {
            return hasSameStyle(elm, attrs[key]);
        }
        return attr(elm, key) === attrs[key];
    });
}
export function elementsEqualAttributes(elm1, elm2) {
    return (elm1.attributes.length === elm2.attributes.length &&
        Array.from(elm1.attributes).every(attr => elm2.hasAttribute(attr.name) &&
            elm2.getAttribute(attr.name) === attr.value));
}
