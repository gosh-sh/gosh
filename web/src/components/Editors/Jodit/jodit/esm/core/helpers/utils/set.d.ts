/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module helpers/utils
 */
import type { IDictionary } from "../../../types";
/**
 * Safe access in tree object
 *
 * @example
 * ```js
 * const a = {}, b = {};
 * Jodit.modules.Helpers.set('a.b.c.d.e', 1, a);
 * console.log(a);// {a: {b: {c: {d: {e: 1}}}}}
 *
 * Jodit.modules.Helpers.set('a.0.e', 1, b);
 * console.log(b);// {a: [{e: 1}]}
 * ```
 */
export declare function set<T>(chain: string, value: unknown, obj: IDictionary): void;
