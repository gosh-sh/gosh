/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * Always return Array. It's a safe polyfill for [Array.from](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from) method
 * In certain scenarios (such as with Joomla Mootools), Array.from may be substituted with a less optimal implementation
 * ```javascript
 * Jodit.modules.Helpers.toArray('123') // ['1', '2', '3']
 * Jodit.modules.Helpers.toArray(['test']) // ['test']
 * Jodit.modules.Helpers.toArray(1) // []
 * ```
 */
export declare const toArray: {
    <T>(arrayLike: ArrayLike<T>): T[];
    <T_1, U>(arrayLike: ArrayLike<T_1>, mapfn: (v: T_1, k: number) => U, thisArg?: any): U[];
    <T_2>(iterable: Iterable<T_2> | ArrayLike<T_2>): T_2[];
    <T_3, U_1>(iterable: Iterable<T_3> | ArrayLike<T_3>, mapfn: (v: T_3, k: number) => U_1, thisArg?: any): U_1[];
};
