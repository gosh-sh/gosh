/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../../../dom/index.js";
import { elementsEqualAttributes, isSameAttributes, toggleAttributes } from "../index.js";
import { _PREFIX, INITIAL, REPLACE, WRAP } from "../../constants.js";
/**
 * Replaces non-leaf items with leaf items and either creates a new list or
 * adds a new item to the nearest old list
 * @private
 */
export function wrapList(commitStyle, wrapper, jodit) {
    const result = jodit.e.fire(`${_PREFIX}BeforeWrapList`, REPLACE, wrapper, commitStyle);
    const newWrapper = result ?? Dom.replace(wrapper, 'li', jodit.createInside);
    const prev = newWrapper.previousElementSibling;
    const next = newWrapper.nextElementSibling;
    let list = Dom.isTag(prev, commitStyle.element) ? prev : null;
    list ?? (list = Dom.isTag(next, commitStyle.element) ? next : null);
    if (!Dom.isList(list) ||
        !isSameAttributes(list, commitStyle.options.attributes)) {
        list = jodit.createInside.element(commitStyle.element);
        toggleAttributes(commitStyle, list, jodit, INITIAL);
        Dom.before(newWrapper, list);
    }
    if (prev === list) {
        Dom.append(list, newWrapper);
    }
    else {
        Dom.prepend(list, newWrapper);
    }
    if (Dom.isTag(list.nextElementSibling, commitStyle.element) &&
        elementsEqualAttributes(list, list.nextElementSibling)) {
        Dom.append(list, Array.from(list.nextElementSibling.childNodes));
        Dom.safeRemove(list.nextElementSibling);
    }
    jodit.e.fire(`${_PREFIX}AfterWrapList`, WRAP, list, commitStyle);
    return list;
}
