/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Config } from "../../config.js";
Config.prototype.controls.subscript = {
    tags: ['sub'],
    tooltip: 'subscript'
};
Config.prototype.controls.superscript = {
    tags: ['sup'],
    tooltip: 'superscript'
};
Config.prototype.controls.bold = {
    tagRegExp: /^(strong|b)$/i,
    tags: ['strong', 'b'],
    css: {
        'font-weight': ['bold', '700']
    },
    tooltip: 'Bold'
};
Config.prototype.controls.italic = {
    tagRegExp: /^(em|i)$/i,
    tags: ['em', 'i'],
    css: {
        'font-style': 'italic'
    },
    tooltip: 'Italic'
};
Config.prototype.controls.underline = {
    tagRegExp: /^(u)$/i,
    tags: ['u'],
    css: {
        'text-decoration-line': 'underline'
    },
    tooltip: 'Underline'
};
Config.prototype.controls.strikethrough = {
    tagRegExp: /^(s)$/i,
    tags: ['s'],
    css: {
        'text-decoration-line': 'line-through'
    },
    tooltip: 'Strike through'
};
