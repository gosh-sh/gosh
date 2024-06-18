/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * Return an array from string or array
 * ```javascript
 * Jodit.modules.Helpers.splitArray('1,2,3') // ['1', '2', '3']
 * Jodit.modules.Helpers.splitArray(['1', '2', '3']) // ['1', '2', '3']
 * ```
 */
export function splitArray(a) {
    return Array.isArray(a) ? a : a.split(/[,\s]+/);
}
