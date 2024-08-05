/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { isBoolean } from "../checker/is-boolean.js";
import { isPlainObject } from "../checker/is-plain-object.js";
import { normalizeCssNumericValue, normalizeCssValue, NUMBER_FIELDS_REG } from "../normalize/normalize-css-value.js";
import { camelCase } from "../string/camel-case.js";
import { kebabCase } from "../string/kebab-case.js";
/**
 * Get the value of a computed style property for the first element in the set of matched elements or set one or
 * more CSS properties for every matched element
 *
 * @param element - HTML element
 * @param key - An object of property-value pairs to set. A CSS property name.
 * @param value - A value to set for the property.
 * @param onlyStyleMode - Get value from style attribute, without calculating
 */
export function css(element, key, value, onlyStyleMode = false) {
    if (isBoolean(value)) {
        onlyStyleMode = value;
        value = undefined;
    }
    if (isPlainObject(key) || value !== undefined) {
        const setValue = (elm, _key, _value) => {
            _value = normalizeCssNumericValue(_key, _value);
            if (_value !== undefined &&
                (_value == null ||
                    css(elm, _key, true) !== normalizeCssValue(_key, _value))) {
                elm.style[_key] = _value;
            }
        };
        if (isPlainObject(key)) {
            const keys = Object.keys(key);
            for (let j = 0; j < keys.length; j += 1) {
                setValue(element, camelCase(keys[j]), key[keys[j]]);
            }
        }
        else {
            setValue(element, camelCase(key), value);
        }
        return '';
    }
    const key2 = kebabCase(key), doc = element.ownerDocument || document, win = doc ? doc.defaultView || doc.parentWindow : false;
    const currentValue = element.style[key];
    let result = '';
    if (currentValue !== undefined && currentValue !== '') {
        result = currentValue;
    }
    else if (win && !onlyStyleMode) {
        result = win.getComputedStyle(element).getPropertyValue(key2);
    }
    if (NUMBER_FIELDS_REG.test(key) &&
        /^[-+]?[0-9.]+px$/.test(result.toString())) {
        result = parseInt(result.toString(), 10);
    }
    return normalizeCssValue(key, result);
}
/**
 * Clear center align
 */
export const clearCenterAlign = (image) => {
    if (css(image, 'display') === 'block') {
        css(image, 'display', '');
    }
    const { style } = image;
    if (style.marginLeft === 'auto' && style.marginRight === 'auto') {
        style.marginLeft = '';
        style.marginRight = '';
    }
};
