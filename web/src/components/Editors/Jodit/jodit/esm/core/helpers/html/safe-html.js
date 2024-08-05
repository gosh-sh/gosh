/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module helpers/html
 */
import { Dom } from "../../dom/dom.js";
import { $$, attr } from "../utils/index.js";
/**
 * Removes dangerous constructs from HTML
 */
export function safeHTML(box, options) {
    if (!Dom.isElement(box) && !Dom.isFragment(box)) {
        return;
    }
    if (options.removeOnError) {
        sanitizeHTMLElement(box);
        $$('[onerror]', box).forEach(elm => sanitizeHTMLElement(elm, options));
    }
    if (options.safeJavaScriptLink) {
        sanitizeHTMLElement(box);
        $$('a[href^="javascript"]', box).forEach(elm => sanitizeHTMLElement(elm, options));
    }
}
export function sanitizeHTMLElement(elm, { safeJavaScriptLink, removeOnError } = {
    safeJavaScriptLink: true,
    removeOnError: true
}) {
    if (!Dom.isElement(elm)) {
        return false;
    }
    let effected = false;
    if (removeOnError && elm.hasAttribute('onerror')) {
        attr(elm, 'onerror', null);
        effected = true;
    }
    const href = elm.getAttribute('href');
    if (safeJavaScriptLink && href && href.trim().indexOf('javascript') === 0) {
        attr(elm, 'href', location.protocol + '//' + href);
        effected = true;
    }
    return effected;
}
