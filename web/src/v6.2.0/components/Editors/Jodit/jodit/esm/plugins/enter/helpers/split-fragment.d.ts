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
 * Splits a block element into two parts
 * and adds a new default block in the middle/start/end
 * @private
 */
export declare function splitFragment(fake: Text, jodit: IJodit, block: HTMLElement): void;
