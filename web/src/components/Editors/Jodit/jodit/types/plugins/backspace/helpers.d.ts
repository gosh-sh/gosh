/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/backspace
 */
import type { IJodit, Nullable } from "../../types";
/**
 * Finds the nearest neighbor that would be in the maximum nesting depth.
 * Ie if neighbor `<DIV><SPAN>Text` then return Text node.
 * @private
 */
export declare function findMostNestedNeighbor(node: Node, right: boolean, root: HTMLElement, onlyInlide?: boolean): Nullable<Node>;
/**
 * @private
 */
export declare function getMoveFilter(jodit: IJodit): (node: Node) => boolean;
