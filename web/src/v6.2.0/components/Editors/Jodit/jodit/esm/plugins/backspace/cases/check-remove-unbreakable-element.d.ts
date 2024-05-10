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
 * Check possibility inseparable Element can be removed (img, hr etc.)
 *
 * @example
 * ```html
 * <p>first second <img>| stop</p>
 * ```
 * result
 * ```html
 * <p>first second | stop</p>
 * ```
 *
 * @private
 */
export declare function checkRemoveUnbreakableElement(jodit: IJodit, fakeNode: Node, backspace: boolean): boolean;
