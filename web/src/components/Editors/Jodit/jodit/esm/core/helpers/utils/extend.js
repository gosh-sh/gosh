/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module helpers/utils
 */
import { stringify } from "../string/stringify.js";
export function isAtom(obj) {
    return obj && obj.isAtom;
}
export function markAsAtomic(obj) {
    Object.defineProperty(obj, 'isAtom', {
        enumerable: false,
        value: true,
        configurable: false
    });
    return obj;
}
export function fastClone(object) {
    return JSON.parse(stringify(object));
}
