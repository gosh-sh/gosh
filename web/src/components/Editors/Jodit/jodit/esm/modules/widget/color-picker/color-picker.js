/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../../core/dom/index.js";
import { attr, hasBrowserColorPicker, isArray, isFunction, isPlainObject, normalizeColor, refs } from "../../../core/helpers/index.js";
import { Icon } from "../../../core/ui/index.js";
import paletteIcon from "./palette.svg.js";
Icon.set('palette', paletteIcon);
/**
 * Build color picker
 *
 * @param callback - Callback 'function (color) \{\}'
 * @param coldColor - Color value ex. #fff or rgb(123, 123, 123) or rgba(123, 123, 123, 1)
 * @example
 * ```javascript
 * const tabs = TabsWidget(editor, {
 *    'Text': ColorPickerWidget(editor, function (color) {
 *         box.style.color = color;
 *     }, box.style.color),
 *     'Background': ColorPickerWidget(editor, function (color) {
 *         box.style.backgroundColor = color;
 *     }, box.style.backgroundColor),
 * });
 * ```
 */
export const ColorPickerWidget = (editor, callback, coldColor) => {
    const cn = 'jodit-color-picker', valueHex = normalizeColor(coldColor), form = editor.c.div(cn), iconPalette = editor.o.textIcons
        ? `<span>${editor.i18n('palette')}</span>`
        : Icon.get('palette'), eachColor = (colors) => {
        const stack = [];
        if (isPlainObject(colors)) {
            Object.keys(colors).forEach(key => {
                stack.push(`<div class="${cn}__group ${cn}__group-${key}">`);
                stack.push(eachColor(colors[key]));
                stack.push('</div>');
            });
        }
        else if (isArray(colors)) {
            colors.forEach(color => {
                stack.push(`<span class='${cn}__color-item ${valueHex === color
                    ? cn + '__color-item_active_true'
                    : ''}' title="${color}" style="background-color:${color}" data-color="${color}"></span>`);
            });
        }
        return stack.join('');
    };
    form.appendChild(editor.c.fromHTML(`<div class="${cn}__groups">${eachColor(editor.o.colors)}</div>`));
    form.appendChild(editor.c.fromHTML(`<div data-ref="extra" class="${cn}__extra"></div>`));
    const { extra } = refs(form);
    if (editor.o.showBrowserColorPicker && hasBrowserColorPicker()) {
        extra.appendChild(editor.c.fromHTML(`<div class="${cn}__native">${iconPalette}<input type="color" value="#ffffff"/></div>`));
        editor.e.on(form, 'change', (e) => {
            e.stopPropagation();
            const target = e.target;
            if (!target || !target.tagName || !Dom.isTag(target, 'input')) {
                return;
            }
            const color = target.value || '';
            if (isFunction(callback)) {
                callback(color);
            }
            e.preventDefault();
        });
    }
    editor.e.on(form, 'mousedown touchend', (e) => {
        e.stopPropagation();
        e.preventDefault();
        let target = e.target;
        if ((!target ||
            !target.tagName ||
            Dom.isTag(target, 'svg') ||
            Dom.isTag(target, 'path')) &&
            target.parentNode) {
            target = Dom.closest(target.parentNode, 'span', editor.editor);
        }
        if (!Dom.isTag(target, 'span') ||
            !target.classList.contains(cn + '__color-item')) {
            return;
        }
        const color = attr(target, '-color') || '';
        if (callback && isFunction(callback)) {
            callback(color);
        }
    });
    editor.e.fire('afterGenerateColorPicker', form, extra, callback, valueHex);
    return form;
};
