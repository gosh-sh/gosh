/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { IS_ES_NEXT, IS_IE } from "../../constants.js";
import { Dom } from "../../dom/dom.js";
import { toArray } from "../array/to-array.js";
import { isString } from "../checker/is-string.js";
import { camelCase } from "../string/camel-case.js";
import { attr, error } from "./index.js";
let temp = 1;
const $$temp = () => {
    temp++;
    return temp;
};
export function $$(selector, root) {
    let result;
    if (!IS_ES_NEXT &&
        /:scope/.test(selector) &&
        IS_IE &&
        !(root && root.nodeType === Node.DOCUMENT_NODE)) {
        const id = root.id, temp_id = id ||
            '_selector_id_' + String(Math.random()).slice(2) + $$temp();
        selector = selector.replace(/:scope/g, '#' + temp_id);
        !id && root.setAttribute('id', temp_id);
        result = root.parentNode.querySelectorAll(selector);
        if (!id) {
            root.removeAttribute('id');
        }
    }
    else {
        result = root.querySelectorAll(selector);
    }
    return [].slice.call(result);
}
/**
 * Calculate XPath selector
 */
export const getXPathByElement = (element, root) => {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
        return '';
    }
    if (!element.parentNode || root === element) {
        return '';
    }
    if (element.id) {
        return "//*[@id='" + element.id + "']";
    }
    const sames = [].filter.call(element.parentNode.childNodes, (x) => x.nodeName === element.nodeName);
    return (getXPathByElement(element.parentNode, root) +
        '/' +
        element.nodeName.toLowerCase() +
        (sames.length > 1
            ? '[' + (toArray(sames).indexOf(element) + 1) + ']'
            : ''));
};
/**
 * Find all `ref` or `data-ref` elements inside HTMLElement
 */
export const refs = (root) => {
    if ('container' in root) {
        root = root.container;
    }
    return $$('[ref],[data-ref]', root).reduce((def, child) => {
        const key = attr(child, '-ref');
        if (key && isString(key)) {
            def[camelCase(key)] = child;
            def[key] = child;
        }
        return def;
    }, {});
};
/**
 * Calculate full CSS selector
 */
export const cssPath = (el) => {
    if (!Dom.isElement(el)) {
        return null;
    }
    const path = [];
    let start = el;
    while (start && start.nodeType === Node.ELEMENT_NODE) {
        let selector = start.nodeName.toLowerCase();
        if (start.id) {
            selector += '#' + start.id;
            path.unshift(selector);
            break;
        }
        else {
            let sib = start, nth = 1;
            do {
                sib = sib.previousElementSibling;
                if (sib && sib.nodeName.toLowerCase() === selector) {
                    nth++;
                }
            } while (sib);
            selector += ':nth-of-type(' + nth + ')';
        }
        path.unshift(selector);
        start = start.parentNode;
    }
    return path.join(' > ');
};
/**
 * Try to find element by selector
 */
export function resolveElement(element, od) {
    let resolved = element;
    if (isString(element)) {
        try {
            resolved = od.querySelector(element);
        }
        catch {
            throw error('String "' + element + '" should be valid HTML selector');
        }
    }
    // Duck checking
    if (!resolved ||
        typeof resolved !== 'object' ||
        !Dom.isElement(resolved) ||
        !resolved.cloneNode) {
        throw error('Element "' + element + '" should be string or HTMLElement instance');
    }
    return resolved;
}
