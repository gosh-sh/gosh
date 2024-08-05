/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../core/dom/index.js";
import { trimChars } from "../../core/helpers/string/trim.js";
import { css } from "../../core/helpers/utils/css.js";
import { Icon } from "../../core/ui/icon.js";
import fontIcon from "./icons/font.svg.js";
import fontsizeIcon from "./icons/fontsize.svg.js";
import { Config } from "../../config.js";
/**
 * Default font-size points
 */
Config.prototype.defaultFontSizePoints = 'px';
Icon.set('font', fontIcon).set('fontsize', fontsizeIcon);
Config.prototype.controls.fontsize = {
    command: 'fontsize',
    data: {
        cssRule: 'font-size',
        normalise: (v, editor) => {
            if (/pt$/i.test(v) && editor.o.defaultFontSizePoints === 'pt') {
                return v.replace(/pt$/i, '');
            }
            return v;
        }
    },
    list: [8, 9, 10, 11, 12, 14, 16, 18, 24, 30, 32, 34, 36, 48, 60, 72, 96],
    textTemplate: (editor, value) => {
        return value + editor.o.defaultFontSizePoints;
    },
    childTemplate: (editor, key, value) => {
        return `${value}${editor.o.defaultFontSizePoints}`;
    },
    tooltip: 'Font size',
    value: (editor, button) => {
        const current = editor.s.current();
        if (!current) {
            return;
        }
        const box = Dom.closest(current, Dom.isElement, editor.editor);
        if (!box) {
            return;
        }
        const control = button.control;
        const cssKey = control.data?.cssRule || 'font-size';
        const value = css(box, cssKey);
        return value.toString();
    },
    isChildActive: (editor, button) => {
        const value = button.state.value;
        const normalize = button.control.data?.normalize ?? ((v) => v);
        return Boolean(value &&
            button.control.args &&
            normalize(button.control.args[0].toString()) ===
                normalize(value.toString()));
    },
    isActive: (editor, button) => {
        const value = button.state.value;
        if (!value) {
            return false;
        }
        const normalize = button.control.data?.normalize ?? ((v) => v);
        let keySet = button.control.data.cacheListSet;
        if (!keySet) {
            const keys = Object.keys(button.control.list).map(normalize);
            keySet = new Set(keys);
            button.control.data.cacheListSet = keySet;
        }
        return keySet.has(normalize(value.toString()));
    }
};
Config.prototype.controls.font = {
    ...Config.prototype.controls.fontsize,
    command: 'fontname',
    textTemplate: (j, value) => {
        const [first] = value.split(',');
        return trimChars(first, '"\'');
    },
    list: {
        '': 'Default',
        'Arial, Helvetica, sans-serif': 'Arial',
        "'Courier New', Courier, monospace": 'Courier New',
        'Georgia, Palatino, serif': 'Georgia',
        "'Lucida Sans Unicode', 'Lucida Grande', sans-serif": 'Lucida Sans Unicode',
        'Tahoma, Geneva, sans-serif': 'Tahoma',
        "'Times New Roman', Times, serif": 'Times New Roman',
        "'Trebuchet MS', Helvetica, sans-serif": 'Trebuchet MS',
        'Helvetica, sans-serif': 'Helvetica',
        'Impact, Charcoal, sans-serif': 'Impact',
        'Verdana, Geneva, sans-serif': 'Verdana'
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
    tooltip: 'Font family'
};
