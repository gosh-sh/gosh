/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { isFunction } from "./is-function.js";
/**
 * Check if an element is instance of View
 */
export function isViewObject(jodit) {
    return Boolean(jodit &&
        jodit instanceof Object &&
        isFunction(jodit.constructor) &&
        jodit.isView);
}
