/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * Always return Array
 * ```javascript
 * Jodit.modules.Helpers.asArray('test') // ['test']
 * Jodit.modules.Helpers.asArray(['test']) // ['test']
 * Jodit.modules.Helpers.asArray(1) // [1]
 * ```
 */
export declare const asArray: <T>(a: T[] | T) => T[];
