/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/clean-html
 */
import type { IJodit, Nullable } from "../../../../types";
/**
 * For collapsed selection move cursor outside or split inline block
 * @private
 */
export declare function removeFormatForCollapsedSelection(jodit: IJodit, fake?: Node): Nullable<Text> | void;
/**
 * Element has inline display mode
 * @private
 */
export declare function isInlineBlock(node: Nullable<Node>): node is Node;
