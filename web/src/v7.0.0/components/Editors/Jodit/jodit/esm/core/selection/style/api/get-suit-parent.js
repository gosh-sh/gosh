/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../../dom/dom.js";
import { isNormalNode } from "./is-normal-node.js";
import { isSuitElement } from "./is-suit-element.js";
/**
 * Checks if the parent of an element is suitable for applying styles, if applicable, then returns the parent *
 *
 * @param style - styles to be applied
 * @param node - checked item
 * @param root - editor root
 * @private
 */
export function getSuitParent(style, node, root) {
    const { parentNode } = node;
    if (parentNode === root ||
        !Dom.isHTMLElement(parentNode) ||
        Dom.next(node, isNormalNode, parentNode) ||
        Dom.prev(node, isNormalNode, parentNode)) {
        return null;
    }
    // <h3><span style="color:red">|test|</span></h3> => apply <h2>
    if (style.isElementCommit &&
        style.elementIsBlock &&
        !Dom.isBlock(parentNode)) {
        return getSuitParent(style, parentNode, root);
    }
    if (isSuitElement(style, parentNode, false) &&
        (!Dom.isBlock(parentNode) || style.elementIsBlock)) {
        return parentNode;
    }
    // <strong style="color:red"><em>|test|</em></strong> => apply <strong>
    if (style.isElementCommit && !Dom.isBlock(parentNode)) {
        return getSuitParent(style, parentNode, root);
    }
    return null;
}
