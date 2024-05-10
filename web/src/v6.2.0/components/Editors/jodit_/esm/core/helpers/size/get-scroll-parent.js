/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../dom/dom.js";
import { css } from "../utils/index.js";
export function getScrollParent(node) {
    if (!node) {
        return null;
    }
    const isElement = Dom.isHTMLElement(node);
    const overflowY = isElement && css(node, 'overflowY');
    const isScrollable = isElement && overflowY !== 'visible' && overflowY !== 'hidden';
    if (isScrollable && node.scrollHeight >= node.clientHeight) {
        return node;
    }
    return (getScrollParent(node.parentNode) ||
        document.scrollingElement ||
        document.body);
}
