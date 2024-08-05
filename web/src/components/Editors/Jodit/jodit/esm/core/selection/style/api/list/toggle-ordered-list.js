/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../../../dom/dom.js";
import { assert } from "../../../../helpers/utils/assert.js";
import { extractSelectedPart } from "../extract.js";
import { toggleAttributes } from "../toggle-attributes.js";
import { _PREFIX, CHANGE, INITIAL, REPLACE, UNWRAP } from "../../constants.js";
import { wrapList } from "./wrap-list.js";
/**
 * Replaces `ul->ol` or `ol->ul`, apply styles to the list, or remove a list item from it
 * @private
 */
export function toggleOrderedList(commitStyle, li, jodit, mode) {
    if (!li) {
        return mode;
    }
    const list = li.parentElement;
    if (!list) {
        return mode;
    }
    const result = jodit.e.fire(`${_PREFIX}BeforeToggleList`, mode, commitStyle, list);
    if (result !== undefined) {
        return result;
    }
    const hook = jodit.e.fire.bind(jodit.e, `${_PREFIX}AfterToggleList`);
    if (mode !== UNWRAP) {
        const isChangeMode = toggleAttributes(commitStyle, li.parentElement, jodit, INITIAL, true) === CHANGE;
        // ul => ol, ol => ul or ul => ul.class1
        if (mode === REPLACE ||
            isChangeMode ||
            list.tagName.toLowerCase() !== commitStyle.element) {
            const wrapper = unwrapList(REPLACE, list, li, jodit, commitStyle);
            const newList = wrapList(commitStyle, wrapper, jodit);
            hook(REPLACE, newList, commitStyle);
            return REPLACE;
        }
    }
    const wrapper = unwrapList(UNWRAP, list, li, jodit, commitStyle);
    hook(UNWRAP, wrapper, commitStyle);
    return UNWRAP;
}
function unwrapList(mode, list, li, jodit, cs) {
    const result = jodit.e.fire(`${_PREFIX}BeforeUnwrapList`, mode, list, cs);
    if (result) {
        assert(Dom.isHTMLElement(result), `${_PREFIX}BeforeUnwrapList hook must return HTMLElement`);
        return result;
    }
    extractSelectedPart(list, li, jodit);
    assert(Dom.isHTMLElement(li.parentElement), 'Element should be inside the list');
    Dom.unwrap(li.parentElement);
    return Dom.replace(li, jodit.o.enter, jodit.createInside);
}
