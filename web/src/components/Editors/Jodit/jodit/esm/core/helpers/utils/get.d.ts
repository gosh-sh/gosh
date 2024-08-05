/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module helpers/utils
 */
import type { IDictionary, Nullable } from "../../../types";
/**
 * Safe access in tree object
 *
 * @example
 * ```js
 * const obj = {
 *   a: {
 *     b: {
 *       c: {
 *         e: false
 *       }
 *     }
 *   }
 * };
 *
 * console.log(Jodit.modules.Helpers.get('a.b.c.d.e', obj) === false); // true
 * console.log(Jodit.modules.Helpers.get('a.b.a.d.e', obj) === null); // false
 * ```
 */
export declare function get<T>(chain: string, obj: IDictionary): Nullable<T>;
