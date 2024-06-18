/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module helpers/utils
 */
import type { Nullable } from "../../../types";
/**
 * Reset Vanilla JS native function
 * @example
 * ```js
 * reset('Array.from')(Set([1,2,3])) // [1, 2, 3]
 * ```
 * You must use the function derived from the method immediately as its iframe is being removed
 */
export declare function reset<T extends Function>(key: string): Nullable<T>;
