/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/enter
 */
import type { IJodit } from "../../../types";
/**
 * Handles pressing the Enter key inside an empty LI inside a list
 * @private
 */
export declare function processEmptyLILeaf(fake: Text, jodit: IJodit, li: HTMLElement): void;
