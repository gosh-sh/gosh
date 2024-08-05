/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { INVISIBLE_SPACE } from "../constants.js";
import { Dom } from "../dom/dom.js";
import { asArray, attr, isFunction, isPlainObject, isString, refs } from "../helpers/index.js";
import { assert } from "../helpers/utils/assert.js";
export class Create {
    get doc() {
        // @ts-ignore - TODO it's a function
        return isFunction(this.document) ? this.document() : this.document;
    }
    constructor(document, createAttributes) {
        this.document = document;
        this.createAttributes = createAttributes;
    }
    element(tagName, childrenOrAttributes, children) {
        const elm = this.doc.createElement(tagName.toLowerCase());
        this.applyCreateAttributes(elm);
        if (childrenOrAttributes) {
            if (isPlainObject(childrenOrAttributes)) {
                attr(elm, childrenOrAttributes);
            }
            else {
                children = childrenOrAttributes;
            }
        }
        if (children) {
            asArray(children).forEach((child) => elm.appendChild(isString(child) ? this.fromHTML(child) : child));
        }
        return elm;
    }
    div(className, childrenOrAttributes, children) {
        const div = this.element('div', childrenOrAttributes, children);
        if (className) {
            div.className = className;
        }
        return div;
    }
    sandbox() {
        const iframe = this.element('iframe', { sandbox: 'allow-same-origin' });
        this.doc.body.appendChild(iframe);
        const doc = iframe.contentWindow?.document;
        assert(doc, 'iframe.contentWindow.document');
        if (!doc) {
            throw Error('Iframe error');
        }
        doc.open();
        doc.write('<!DOCTYPE html><html><head></head><body></body></html>');
        doc.close();
        return [doc.body, iframe];
    }
    span(className, childrenOrAttributes, children) {
        const span = this.element('span', childrenOrAttributes, children);
        if (className) {
            span.className = className;
        }
        return span;
    }
    a(className, childrenOrAttributes, children) {
        const a = this.element('a', childrenOrAttributes, children);
        if (className) {
            a.className = className;
        }
        return a;
    }
    /**
     * Create text node
     */
    text(value) {
        return this.doc.createTextNode(value);
    }
    /**
     * Create invisible text node
     */
    fake() {
        return this.text(INVISIBLE_SPACE);
    }
    /**
     * Create HTML Document fragment element
     */
    fragment() {
        return this.doc.createDocumentFragment();
    }
    /**
     * Create a DOM element from HTML text
     *
     // eslint-disable-next-line tsdoc/syntax
     * @param refsToggleElement - State dictionary in which you can set the visibility of some of the elements
     * ```js
     * const editor = Jodit.make('#editor');
     * editor.createInside.fromHTML(`<div>
     *   <input name="name" ref="name"/>
     *   <input name="email" ref="email"/>
     * </div>`, {
     *   name: true,
     *   email: false
     * });
     * ```
     */
    fromHTML(html, refsToggleElement) {
        const div = this.div();
        div.innerHTML = html.toString();
        const child = div.firstChild !== div.lastChild || !div.firstChild
            ? div
            : div.firstChild;
        Dom.safeRemove(child);
        if (refsToggleElement) {
            const refElements = refs(child);
            Object.keys(refsToggleElement).forEach(key => {
                const elm = refElements[key];
                if (elm && refsToggleElement[key] === false) {
                    Dom.hide(elm);
                }
            });
        }
        return child;
    }
    /**
     * Apply to element `createAttributes` options
     */
    applyCreateAttributes(elm) {
        if (this.createAttributes) {
            const ca = this.createAttributes;
            if (ca && ca[elm.tagName.toLowerCase()]) {
                const attrsOpt = ca[elm.tagName.toLowerCase()];
                if (isFunction(attrsOpt)) {
                    attrsOpt(elm);
                }
                else if (isPlainObject(attrsOpt)) {
                    attr(elm, attrsOpt);
                }
            }
        }
    }
}
