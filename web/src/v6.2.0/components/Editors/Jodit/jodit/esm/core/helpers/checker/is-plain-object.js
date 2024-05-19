/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { isWindow } from "./is-window.js";
/**
 * Check if element is simple plaint object
 */
export function isPlainObject(obj) {
    if (!obj || typeof obj !== 'object' || obj.nodeType || isWindow(obj)) {
        return false;
    }
    return !(obj.constructor &&
        !{}.hasOwnProperty.call(obj.constructor.prototype, 'isPrototypeOf'));
}
