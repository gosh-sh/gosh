/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../jodit/esm/core/dom/index.js";
import { css } from "../../jodit/esm/core/helpers/utils/css.js";
import { Icon } from "../../jodit/esm/core/ui/icon.js";
import fontsizeIcon from "./icons/fontsize.svg.js";
import { Config } from "../../jodit/esm/config.js";
/**
 * Default font-size points
 */
Config.prototype.defaultFontSizePoints = 'px';
Icon.set('font-size', fontsizeIcon);
Config.prototype.controls.fontsizepro = {
    ...Config.prototype.controls.fontsize,
    command: 'font-size',
    defaultValue: ['16px'],
    name: "Size",
    isInput: true,
    data: {
        currentValue: ''
    },
    update(editor, button) {
        const control = button.control;
        const value = button.state.value;
        if (!value) {
            return false;
        }
        button.state.text = value + editor.o.defaultFontSizePoints;
        control.data.currentValue = value;
    },

    template: (editor, key, value) => {
        return `<span data-style="${key}" style='width: 35px !important; text-align: left; text-overflow: ellipsis; overflow: hidden; text-wrap: nowrap;'}'>${value}</span>`;
    },
};



Config.prototype.controls.fontfamily = {
    ...Config.prototype.controls.fontsize,
    command: 'font-family',
    name: 'Font Family',
    tooltip: 'Font family',
    defaultValue: ['', 'sans-serif, -apple-system'],
    isInput: true,
    data: {
        currentValue: ''
    },
    update(editor, button) {
        const control = button.control, current = editor.s.current();
        if (current) {
            const currentBox = Dom.closest(current, Dom.isElement, editor.editor) ||
                editor.editor;
            let currentValue = css(currentBox, 'font-family').toString().replaceAll(`"`, `'`);
            if (control.defaultValue &&
                control.defaultValue.indexOf(currentValue) !== -1) {
                currentValue = '';
            }
            if (control.data &&
                control.data.currentValue !== currentValue &&
                control.list &&
                control.list[currentValue]) {
                if (editor.o.textIcons || control.component === 'select') {
                    button.control.name = currentValue;
                }
                button.state.text = control.list[currentValue];
                control.data.currentValue = currentValue;
            }
        }
    },
    list: {
        "": 'Default',
        "Arial, Helvetica, sans-serif": 'Arial',
        "'Courier New', Courier, monospace": 'Courier New',
        "Georgia, Palatino, serif": 'Georgia',
        "'Lucida Sans Unicode', 'Lucida Grande', sans-serif": 'Lucida Sans Unicode',
        "Tahoma, Geneva, sans-serif": 'Tahoma',
        "'Times New Roman', Times, serif": 'Times New Roman',
        "'Trebuchet MS', Helvetica, sans-serif": 'Trebuchet MS',
        "Helvetica, sans-serif": 'Helvetica',
        "Impact, Charcoal, sans-serif": 'Impact',
        "Verdana, Geneva, sans-serif": 'Verdana'
    },
    template: (editor, key, value) => {
        return `<span data-style="${key}" style='width: 100px !important; text-align: left; text-overflow: ellipsis; overflow: hidden; text-wrap: nowrap;'}'>${value}</span>`;
    },
    childTemplate: (editor, key, value) => {
        let isAvailable = false;
        try {
            isAvailable =
                key.indexOf('dings') === -1 &&
                    document.fonts.check(`16px ${key}`, value);
        }
        catch { }
        return `<span data-style="${key}" style="${isAvailable ? `font-family: ${key}!important;` : ''}">${value}</span>`;
    },
    data: {
        cssRule: 'font-family',
        normalize: (v) => {
            return v
                .toLowerCase()
                .replace(/['"]+/g, '')
                .replace(/[^a-z0-9-]+/g, ',');
        }
    },
};
