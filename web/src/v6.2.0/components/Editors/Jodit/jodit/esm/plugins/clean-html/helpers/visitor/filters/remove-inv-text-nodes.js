/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { INVISIBLE_SPACE_REG_EXP as INV_REG } from "../../../../../core/constants.js";
import { Dom } from "../../../../../core/dom/dom.js";
/**
 * @private
 */
export function removeInvTextNodes(jodit, node, hadEffect, arg, argi, currentNode) {
    if (currentNode === node || !Dom.isText(node) || node.nodeValue == null) {
        return hadEffect;
    }
    if (!INV_REG().test(node.nodeValue)) {
        return hadEffect;
    }
    const focusBox = Dom.furthest(currentNode, Dom.isBlock, jodit.editor);
    if (!focusBox || Dom.isOrContains(focusBox, node)) {
        return hadEffect;
    }
    node.nodeValue = node.nodeValue.replace(INV_REG(), '');
    if (node === currentNode && jodit.s.isCollapsed()) {
        jodit.s.setCursorAfter(node);
    }
    if (!node.nodeValue) {
        Dom.safeRemove(node);
    }
    return true;
}
