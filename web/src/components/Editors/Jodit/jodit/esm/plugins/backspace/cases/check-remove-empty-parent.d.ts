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
 * Check if the current empty item can be removed
 *
 * @example
 * ```html
 * <p>first stop</p><p>|<br></p>
 * ```
 * result
 * ```html
 * <p>first stop|</p>
 * ```
 *
 * @private
 */
export declare function checkRemoveEmptyParent(jodit: IJodit, fakeNode: Node, backspace: boolean): boolean;
