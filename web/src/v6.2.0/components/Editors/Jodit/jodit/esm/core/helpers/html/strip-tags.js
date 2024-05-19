/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../dom/dom.js";
import { isString } from "../checker/is-string.js";
import { trim } from "../string/trim.js";
import { $$ } from "../utils/index.js";
const NEW_LINE_TAGS = new Set([
    'div',
    'p',
    'br',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr'
]);
const INVISIBLE_TAGS = new Set(['script', 'style']);
const ALONE_TAGS = new Set(['br', 'hr', 'input']);
/**
 * Extract plain text from HTML text
 */
export function stripTags(html, doc = document, exclude = null) {
    const tmp = doc.createElement('div');
    if (isString(html)) {
        tmp.innerHTML = html;
    }
    else {
        tmp.appendChild(html);
    }
    $$('*', tmp).forEach(p => {
        const pr = p.parentNode;
        if (!pr) {
            return;
        }
        if (exclude && Dom.isTag(p, exclude)) {
            const tag = p.nodeName.toLowerCase();
            const text = !Dom.isTag(p, ALONE_TAGS)
                ? `%%%jodit-${tag}%%%${stripTags(p.innerHTML, doc, exclude)}%%%/jodit-${tag}%%%`
                : `%%%jodit-single-${tag}%%%`;
            Dom.before(p, doc.createTextNode(text));
            Dom.safeRemove(p);
            return;
        }
        if (Dom.isTag(p, INVISIBLE_TAGS)) {
            Dom.safeRemove(p);
            return;
        }
        if (!Dom.isTag(p, NEW_LINE_TAGS)) {
            return;
        }
        const nx = p.nextSibling;
        if (Dom.isText(nx) && /^\s/.test(nx.nodeValue || '')) {
            return;
        }
        if (nx) {
            pr.insertBefore(doc.createTextNode(' '), nx);
        }
    });
    return restoreTags(trim(tmp.innerText));
}
function restoreTags(content) {
    return content.replace(/%%%(\/)?jodit(-single)?-([\w\n]+)%%%/g, (_, isClosed, isSingle, tag) => `<${isClosed ? '/' : ''}${tag}>`);
}
