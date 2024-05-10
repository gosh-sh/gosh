/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/dtd
 * @internal
 */
import type { IJodit } from "../../../types";
/**
 * Checks if there is a tag in the block element after the inserted br node,
 * if so, removes it
 * @internal
 */
export declare function removeExtraBr(jodit: IJodit, node: Node): void;
