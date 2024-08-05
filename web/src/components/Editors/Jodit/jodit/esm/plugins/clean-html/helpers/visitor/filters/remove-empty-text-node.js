/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../../../../core/dom/dom.js";
/**
 * @private
 */
export function removeEmptyTextNode(jodit, node, hadEffect, arg, argi, currentNode) {
    if (Dom.isText(node) && !node.nodeValue) {
        if (node === currentNode && jodit.s.isCollapsed()) {
            jodit.s.setCursorAfter(node);
        }
        Dom.safeRemove(node);
        return true;
    }
    return hadEffect;
}
