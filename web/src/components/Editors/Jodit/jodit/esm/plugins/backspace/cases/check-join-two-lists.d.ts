/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/backspace
 */
import type { IJodit } from "../../../types";
/**
 * Try join two UL elements
 *
 * @example
 * ```html
 * <ul><li>one</li></ul>|<ol><li>two</li></ol>
 * ```
 * Result
 * ```html
 * <ul><li>one|</li><li>two</li></ul>
 * ```
 * @private
 */
export declare function checkJoinTwoLists(jodit: IJodit, fakeNode: Node, backspace: boolean): boolean;
