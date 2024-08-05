/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module helpers/checker
 */
import { isFunction } from "./is-function.js";
/**
 * Check if element is set
 */
export function isSet(elm) {
    return (Boolean(elm) &&
        isFunction(elm.has) &&
        isFunction(elm.add) &&
        isFunction(elm.delete));
}
