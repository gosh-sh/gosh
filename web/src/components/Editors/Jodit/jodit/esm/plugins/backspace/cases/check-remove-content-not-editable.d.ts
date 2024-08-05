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
 * Checks if a non-editable element can be deleted
 * @private
 */
export declare function checkRemoveContentNotEditable(jodit: IJodit, fakeNode: Text, backspace: boolean): boolean;
