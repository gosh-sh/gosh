/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/tab
 */
import type { IJodit } from "../../../types";
/**
 * Checks if the cursor is at the beginning of the LI element when tabbed.
 * If so then add an internal list
 * @private
 */
export declare function onTabInsideLi(jodit: IJodit, shift?: boolean): boolean;
