/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/backspace
 */
import type { IJodit } from "../../../types";
import type { DeleteMode } from "../interface";
/**
 * Check possibility the char can be removed
 *
 * @example
 * ```html
 * te|st
 * ```
 * result
 * ```html
 * t|st
 * ```
 * @private
 */
export declare function checkRemoveChar(jodit: IJodit, fakeNode: Node, backspace: boolean, mode: DeleteMode): boolean;
