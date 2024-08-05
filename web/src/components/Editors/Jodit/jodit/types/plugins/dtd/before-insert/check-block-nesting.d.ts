/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/dtd
 * @internal
 */
import type { IJodit, Nullable } from "../../../types";
/**
 * Checks whether the insertion of an element at the current location is allowed,
 * if it is not allowed, it deletes an empty block element or moves the cursor after it
 * @internal
 */
export declare function checkBlockNesting(jodit: IJodit, node: Nullable<Node>): void;
