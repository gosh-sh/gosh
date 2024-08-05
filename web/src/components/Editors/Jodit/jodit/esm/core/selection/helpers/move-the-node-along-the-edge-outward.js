/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../dom/dom.js";
/**
 * Moves the fake node up until it encounters a non-empty sibling on the left(right)
 * @private
 */
export function moveTheNodeAlongTheEdgeOutward(node, start, root) {
    let item = node;
    while (item && item !== root) {
        const sibling = Dom.findSibling(item, start);
        if (sibling) {
            return;
        }
        if (Dom.isBlock(item.parentElement)) {
            break;
        }
        item = item.parentElement;
        if (item && item !== root) {
            start ? Dom.before(item, node) : Dom.after(item, node);
        }
    }
    return;
}
