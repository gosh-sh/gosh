/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { IS_INLINE } from "../../../../../core/constants.js";
import { Dom } from "../../../../../core/dom/dom.js";
import { trim } from "../../../../../core/helpers/string/trim.js";
/**
 * @private
 */
export function tryRemoveNode(jodit, nodeElm, hadEffect, allowTags, denyTags, currentSelectionNode) {
    if (isRemovableNode(jodit, nodeElm, currentSelectionNode, allowTags, denyTags)) {
        Dom.safeRemove(nodeElm);
        return true;
    }
    return hadEffect;
}
/**
 * @private
 */
function isRemovableNode(jodit, node, current, allow, deny) {
    if (!Dom.isText(node) &&
        ((allow && !allow[node.nodeName]) || (deny && deny[node.nodeName]))) {
        return true;
    }
    return (jodit.o.cleanHTML.removeEmptyElements &&
        Dom.isElement(node) &&
        node.nodeName.match(IS_INLINE) != null &&
        !Dom.isTemporary(node) &&
        trim(node.innerHTML).length === 0 &&
        (current == null || !Dom.isOrContains(node, current)));
}
