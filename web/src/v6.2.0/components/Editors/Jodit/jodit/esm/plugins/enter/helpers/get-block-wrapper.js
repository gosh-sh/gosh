/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import * as consts from "../../../core/constants.js";
import { Dom } from "../../../core/dom/dom.js";
/**
 * Finds a suitable parent block container
 * @private
 */
export function getBlockWrapper(fake, jodit, tagReg = consts.IS_BLOCK) {
    let node = fake;
    const root = jodit.editor;
    do {
        if (!node || node === root) {
            break;
        }
        if (tagReg.test(node.nodeName)) {
            if (Dom.isLeaf(node)) {
                return node;
            }
            return (getBlockWrapper(node.parentNode, jodit, /^li$/i) ||
                node);
        }
        node = node.parentNode;
    } while (node && node !== root);
    return null;
}
