/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../../../../core/dom/dom.js";
/**
 * @private
 */
export function replaceOldTags(jodit, nodeElm, hadEffect) {
    const newNodeElm = replaceIfMatched(jodit, nodeElm, jodit.o.cleanHTML.replaceOldTags);
    if (nodeElm !== newNodeElm) {
        nodeElm = newNodeElm;
        return true;
    }
    return hadEffect;
}
/**
 * Replaces an element with a newer one if specified in the configuration match
 * @private
 */
function replaceIfMatched(jodit, oldParent, list) {
    if (!list || !Dom.isHTMLElement(oldParent)) {
        return oldParent;
    }
    const tagName = list[oldParent.nodeName.toLowerCase()] || list[oldParent.nodeName];
    if (tagName) {
        return Dom.replace(oldParent, tagName, jodit.createInside, true, false);
    }
    return oldParent;
}
