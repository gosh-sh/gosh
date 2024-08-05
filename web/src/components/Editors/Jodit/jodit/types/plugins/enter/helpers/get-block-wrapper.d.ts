/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/enter
 */
import type { IJodit, Nullable } from "../../../types";
/**
 * Finds a suitable parent block container
 * @private
 */
export declare function getBlockWrapper(fake: Node | null, jodit: IJodit, tagReg?: RegExp): Nullable<HTMLElement>;
