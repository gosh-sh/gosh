/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import type { IStyle } from "../../../../types";
/**
 * Element has the same styles as in the commit
 * @private
 */
export declare function hasSameStyle(elm: Node, rules: IStyle): boolean;
/**
 * Element has the similar styles keys
 */
export declare function hasSameStyleKeys(elm: Node, rules: IStyle): boolean;
