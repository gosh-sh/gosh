/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../../core/dom/dom.js";
import { scrollIntoViewIfNeeded } from "../../../core/helpers/utils/scroll-into-view.js";
/**
 * Insert default paragraph
 * @private
 */
export function insertParagraph(fake, editor, wrapperTag, style) {
    const isBR = wrapperTag.toLowerCase() === 'br', { createInside } = editor, p = createInside.element(wrapperTag), br = createInside.element('br');
    if (!isBR) {
        p.appendChild(br);
    }
    if (style && style.cssText) {
        p.setAttribute('style', style.cssText);
    }
    Dom.after(fake, p);
    Dom.before(isBR ? p : br, fake);
    scrollIntoViewIfNeeded(p, editor.editor, editor.ed);
    return p;
}
