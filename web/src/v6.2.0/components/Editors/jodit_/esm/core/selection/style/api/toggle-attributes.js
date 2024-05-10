/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../../dom/dom.js";
import { getContainer } from "../../../global.js";
import { isBoolean, isNumber, isPlainObject, isString } from "../../../helpers/checker/index.js";
import { normalizeCssValue } from "../../../helpers/normalize/normalize-css-value.js";
import { size } from "../../../helpers/size/object-size.js";
import { kebabCase } from "../../../helpers/string/kebab-case.js";
import { assert, attr } from "../../../helpers/utils/index.js";
import { css } from "../../../helpers/utils/css.js";
import { dataBind } from "../../../helpers/utils/data-bind.js";
import { _PREFIX, CHANGE, UNSET, UNWRAP } from "../constants.js";
const tak = 'toggleAttributes';
/**
 * Toggles attributes
 * @private
 */
export function toggleAttributes(commitStyle, elm, jodit, mode, dry = false) {
    if (!dry && commitStyle.isApplied(elm, tak)) {
        return mode;
    }
    !dry && commitStyle.setApplied(elm, tak);
    const { attributes } = commitStyle.options;
    if (attributes && size(attributes) > 0) {
        Object.keys(attributes).forEach((key) => {
            const value = attributes[key];
            switch (key) {
                case 'style': {
                    mode = toggleStyle(commitStyle, jodit, value, elm, dry, mode);
                    break;
                }
                case 'className':
                case 'class':
                    mode = toggleClass(jodit, value, elm, mode, dry);
                    break;
                default:
                    mode = toggleAttribute(jodit, value, elm, key, dry, mode);
            }
        });
    }
    return mode;
}
function toggleStyle(commitStyle, jodit, style, elm, dry, mode) {
    assert(isPlainObject(style) && size(style), 'Style must be an object');
    Object.keys(style).forEach((rule) => {
        const inlineValue = elm.style.getPropertyValue(kebabCase(rule));
        const newValue = style[rule];
        if (inlineValue === '' && newValue == null) {
            return;
        }
        if (getNativeCSSValue(jodit, elm, rule) ===
            normalizeCssValue(rule, newValue)) {
            if (!inlineValue) {
                return;
            }
            !dry && css(elm, rule, null);
            mode = UNSET;
            mode = removeExtraStyleAttribute(commitStyle, elm, mode);
            return;
        }
        mode = CHANGE;
        if (!dry) {
            css(elm, rule, newValue);
            mode = removeExtraStyleAttribute(commitStyle, elm, mode);
        }
    });
    return mode;
}
function toggleClass(jodit, value, elm, mode, dry) {
    assert(isString(value), 'Class name must be a string');
    const hook = jodit.e.fire.bind(jodit.e, `${_PREFIX}AfterToggleAttribute`);
    if (elm.classList.contains(value.toString())) {
        mode = UNSET;
        if (!dry) {
            elm.classList.remove(value);
            if (elm.classList.length === 0) {
                attr(elm, 'class', null);
                hook(mode, elm, 'class', null);
            }
        }
    }
    else {
        mode = CHANGE;
        if (!dry) {
            elm.classList.add(value);
            hook(mode, elm, 'class', value);
        }
    }
    return mode;
}
function toggleAttribute(jodit, value, elm, key, dry, mode) {
    assert(isString(value) || isNumber(value) || isBoolean(value) || value == null, 'Attribute value must be a string or number or boolean or null');
    const hook = jodit.e.fire.bind(jodit.e, `${_PREFIX}AfterToggleAttribute`);
    if (attr(elm, key) === value) {
        !dry && attr(elm, key, null);
        mode = UNSET;
        !dry && hook(mode, elm, key, value);
        return mode;
    }
    mode = CHANGE;
    if (!dry) {
        attr(elm, key, value);
        hook(mode, elm, key, value);
    }
    return mode;
}
/**
 * If the element has an empty style attribute, it removes the attribute,
 * and if it is default, it removes the element itself
 */
function removeExtraStyleAttribute(commitStyle, elm, mode) {
    if (!attr(elm, 'style')) {
        attr(elm, 'style', null);
        if (elm.tagName.toLowerCase() === commitStyle.defaultTag) {
            Dom.unwrap(elm);
            mode = UNWRAP;
        }
    }
    return mode;
}
/**
 * Creates an iframe into which elements will be inserted to test their default styles in the browser
 */
function getShadowRoot(jodit) {
    if (dataBind(jodit, 'shadowRoot') !== undefined) {
        return dataBind(jodit, 'shadowRoot');
    }
    const container = getContainer(jodit);
    const iframe = document.createElement('iframe');
    css(iframe, {
        width: 0,
        height: 0,
        position: 'absolute',
        border: 0
    });
    iframe.src = 'about:blank';
    container.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    const shadowRoot = !doc ? jodit.od.body : doc.body;
    dataBind(jodit, 'shadowRoot', shadowRoot);
    return shadowRoot;
}
/**
 * `strong -> fontWeight 700`
 */
function getNativeCSSValue(jodit, elm, key) {
    const newElm = jodit.create.element(elm.tagName.toLowerCase());
    newElm.style.cssText = elm.style.cssText;
    const root = getShadowRoot(jodit);
    root.appendChild(newElm);
    const result = css(newElm, key);
    Dom.safeRemove(newElm);
    return result;
}
