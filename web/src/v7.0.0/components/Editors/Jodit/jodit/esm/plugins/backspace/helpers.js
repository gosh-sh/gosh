/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../core/dom/index.js";
/**
 * Finds the nearest neighbor that would be in the maximum nesting depth.
 * Ie if neighbor `<DIV><SPAN>Text` then return Text node.
 * @private
 */
export function findMostNestedNeighbor(node, right, root, onlyInlide = false) {
    const nextChild = (node) => right ? node.firstChild : node.lastChild;
    let next = Dom.findNotEmptyNeighbor(node, !right, root);
    if (onlyInlide && Dom.isElement(next) && !Dom.isInlineBlock(next)) {
        return null;
    }
    if (next) {
        do {
            if (nextChild(next)) {
                next = nextChild(next);
            }
            else {
                return next;
            }
        } while (next);
    }
    return null;
}
/**
 * @private
 */
export function getMoveFilter(jodit) {
    return (node) => jodit.e.fire('backSpaceIsMovedIgnore', node) !== true;
}
