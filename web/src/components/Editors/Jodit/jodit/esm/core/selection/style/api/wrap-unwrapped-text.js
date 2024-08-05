/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../../dom/dom.js";
import { isMarker } from "../../../helpers/checker/is-marker.js";
/**
 * Wrap text or inline elements inside Block element
 * @private
 */
export function wrapUnwrappedText(style, elm, jodit) {
    const root = jodit.editor, ci = jodit.createInside, edge = (n, key = 'previousSibling') => {
        let edgeNode = n, node = n;
        while (node && !isMarker(node)) {
            if (Dom.isTag(node, jodit.o.enter)) {
                break;
            }
            edgeNode = node;
            if (node[key]) {
                node = node[key];
            }
            else {
                node =
                    node.parentNode &&
                        !Dom.isBlock(node.parentNode) &&
                        node.parentNode !== root
                        ? node.parentNode
                        : null;
            }
            if (Dom.isBlock(node)) {
                break;
            }
        }
        return edgeNode;
    };
    const start = edge(elm), end = edge(elm, 'nextSibling');
    const range = jodit.s.createRange();
    range.setStartBefore(start);
    range.setEndAfter(end);
    const fragment = range.extractContents();
    const wrapper = ci.element(style.element);
    wrapper.appendChild(fragment);
    Dom.safeInsertNode(range, wrapper);
    if (style.elementIsBlock) {
        if (Dom.isEmpty(wrapper) &&
            !Dom.isTag(wrapper.firstElementChild, 'br')) {
            wrapper.appendChild(ci.element('br'));
        }
    }
    return wrapper;
}
