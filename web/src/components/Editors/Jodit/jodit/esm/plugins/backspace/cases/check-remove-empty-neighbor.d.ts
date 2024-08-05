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
 * Check if it is possible to remove an empty adjacent element.
 *
 * @example
 * ```html
 * <p><br></p><p>|second stop</p>
 * ```
 * result
 * ```html
 * <p>|second stop</p>
 * ```
 * @private
 */
export declare function checkRemoveEmptyNeighbor(jodit: IJodit, fakeNode: Node, backspace: boolean): boolean;
