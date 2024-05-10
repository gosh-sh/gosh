/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { isArray, isPlainObject, isString } from "../checker/index.js";
export function size(subject) {
    if (isString(subject) || isArray(subject)) {
        return subject.length;
    }
    if (isPlainObject(subject)) {
        return Object.keys(subject).length;
    }
    return 0;
}
