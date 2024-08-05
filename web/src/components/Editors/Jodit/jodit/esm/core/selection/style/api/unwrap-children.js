/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../../dom/dom.js";
import { attr, css } from "../../../helpers/utils/index.js";
import { hasSameStyleKeys } from "./has-same-style.js";
import { isSameStyleChild, isSuitElement } from "./is-suit-element.js";
/**
 * Unwrap all suit elements inside
 * @private
 */
export function unwrapChildren(style, font) {
    const needUnwrap = [];
    const needChangeStyle = [];
    let firstElementSuit;
    const cssStyle = style.options.attributes?.style;
    if (font.firstChild) {
        const gen = Dom.eachGen(font);
        let item = gen.next();
        while (!item.done) {
            const elm = item.value;
            if (isSuitElement(style, elm, true) &&
                (!cssStyle || hasSameStyleKeys(elm, cssStyle))) {
                if (firstElementSuit === undefined) {
                    firstElementSuit = true;
                }
                needUnwrap.push(elm);
            }
            else if (cssStyle && isSameStyleChild(style, elm)) {
                if (firstElementSuit === undefined) {
                    firstElementSuit = false;
                }
                needChangeStyle.push(() => {
                    css(elm, Object.keys(cssStyle).reduce((acc, key) => {
                        acc[key] = null;
                        return acc;
                    }, {}));
                    if (!attr(elm, 'style')) {
                        attr(elm, 'style', null);
                    }
                    if (!attr(elm, 'style') &&
                        elm.nodeName.toLowerCase() === style.element) {
                        needUnwrap.push(elm);
                    }
                });
            }
            else if (!Dom.isEmptyTextNode(elm)) {
                if (firstElementSuit === undefined) {
                    firstElementSuit = false;
                }
            }
            item = gen.next();
        }
    }
    needChangeStyle.forEach(clb => clb());
    needUnwrap.forEach(Dom.unwrap);
    return Boolean(firstElementSuit);
}
