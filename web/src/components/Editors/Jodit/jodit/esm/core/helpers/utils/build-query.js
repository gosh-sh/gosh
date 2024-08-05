/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { isPlainObject } from "../checker/is-plain-object.js";
/**
 * Build query string
 */
export const buildQuery = (data, prefix) => {
    const str = [];
    const enc = encodeURIComponent;
    for (const dataKey in data) {
        if (Object.prototype.hasOwnProperty.call(data, dataKey)) {
            const k = prefix ? prefix + '[' + dataKey + ']' : dataKey;
            const v = data[dataKey];
            str.push(isPlainObject(v) ? buildQuery(v, k) : enc(k) + '=' + enc(v));
        }
    }
    return str.join('&');
};
