/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../../../../core/dom/dom.js";
/**
 * @private
 */
export function allowAttributes(jodit, nodeElm, hadEffect, allow) {
    if (allow && Dom.isElement(nodeElm) && allow[nodeElm.nodeName] !== true) {
        const attrs = nodeElm.attributes;
        if (attrs && attrs.length) {
            const removeAttrs = [];
            for (let i = 0; i < attrs.length; i += 1) {
                const attr = allow[nodeElm.nodeName][attrs[i].name];
                if (!attr || (attr !== true && attr !== attrs[i].value)) {
                    removeAttrs.push(attrs[i].name);
                }
            }
            if (removeAttrs.length) {
                hadEffect = true;
            }
            removeAttrs.forEach(attr => {
                nodeElm.removeAttribute(attr);
            });
        }
    }
    return hadEffect;
}
