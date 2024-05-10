/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * Safe stringify circular object
 */
export function stringify(value, options = {}) {
    if (typeof value !== 'object') {
        return String(value);
    }
    const excludeKeys = new Set(options.excludeKeys);
    const map = new WeakMap();
    const r = (k, v) => {
        if (excludeKeys.has(k)) {
            return;
        }
        if (typeof v === 'object' && v != null) {
            if (map.get(v)) {
                return '[refObject]';
            }
            map.set(v, true);
        }
        return v;
    };
    return JSON.stringify(value, r, options.prettify);
}
