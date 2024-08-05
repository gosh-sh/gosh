/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { isFunction } from "./is-function.js";
/**
 * Check if element is instance of Jodit
 */
export function isJoditObject(jodit) {
    return Boolean(jodit &&
        jodit instanceof Object &&
        isFunction(jodit.constructor) &&
        // @ts-ignore
        ((typeof Jodit !== 'undefined' && jodit instanceof Jodit) ||
            jodit.isJodit));
}
