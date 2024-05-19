/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module helpers/checker
 */
import { stringify } from "../string/stringify.js";
/**
 * Check two element are equal
 */
export function isEqual(a, b) {
    return a === b || stringify(a) === stringify(b);
}
export function isFastEqual(a, b) {
    return a === b;
}
