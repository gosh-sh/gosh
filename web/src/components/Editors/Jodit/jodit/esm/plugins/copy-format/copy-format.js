/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../core/dom/dom.js";
import { extendLang, pluginSystem } from "../../core/global.js";
import { css } from "../../core/helpers/utils/css.js";
import { Icon } from "../../core/ui/icon.js";
import copyFormatIcon from "./copy-format.svg.js";
import * as langs from "./langs/index.js";
import { Config } from "../../config.js";
const pluginKey = 'copy-format';
/**
 * Plug-in copy and paste formatting from one element to another
 */
const copyStyles = [
    'fontWeight',
    'fontStyle',
    'fontSize',
    'color',
    'margin',
    'padding',
    'borderWidth',
    'borderStyle',
    'borderColor',
    'borderRadius',
    'backgroundColor',
    'textDecorationLine',
    'fontFamily'
];
const getStyle = (editor, key, box, defaultStyles) => {
    let result = css(box, key);
    if (result === defaultStyles[key]) {
        if (box.parentNode &&
            box !== editor.editor &&
            box.parentNode !== editor.editor) {
            result = getStyle(editor, key, box.parentNode, defaultStyles);
        }
        else {
            result = undefined;
        }
    }
    return result;
};
const getStyles = (editor, box, defaultStyles) => {
    const result = {};
    if (box) {
        copyStyles.forEach((key) => {
            result[key] = getStyle(editor, key, box, defaultStyles);
            if (key.match(/border(Style|Color)/) && !result.borderWidth) {
                result[key] = undefined;
            }
        });
    }
    return result;
};
Config.prototype.controls.copyformat = {
    exec: (editor, current, { button }) => {
        if (!current) {
            return;
        }
        if (editor.buffer.exists(pluginKey)) {
            editor.buffer.delete(pluginKey);
            editor.e.off(editor.editor, 'mouseup.' + pluginKey);
        }
        else {
            const defaultStyles = {}, box = Dom.up(current, (elm) => elm && !Dom.isText(elm), editor.editor) || editor.editor;
            const ideal = editor.createInside.span();
            editor.editor.appendChild(ideal);
            copyStyles.forEach((key) => {
                defaultStyles[key] = css(ideal, key);
            });
            if (ideal !== editor.editor) {
                Dom.safeRemove(ideal);
            }
            const format = getStyles(editor, box, defaultStyles);
            const onMouseUp = () => {
                editor.buffer.delete(pluginKey);
                const currentNode = editor.s.current();
                if (currentNode) {
                    if (Dom.isTag(currentNode, 'img')) {
                        css(currentNode, format);
                    }
                    else {
                        editor.s.commitStyle({
                            attributes: {
                                style: format
                            }
                        });
                    }
                }
                editor.e.off(editor.editor, 'mouseup.' + pluginKey);
            };
            editor.e.on(editor.editor, 'mouseup.' + pluginKey, onMouseUp);
            editor.buffer.set(pluginKey, true);
        }
        button.update();
    },
    isActive: (editor) => editor.buffer.exists(pluginKey),
    tooltip: 'Paint format'
};
export function copyFormat(editor) {
    editor.registerButton({
        name: 'copyformat',
        group: 'clipboard'
    });
    extendLang(langs);
}
pluginSystem.add('copyformat', copyFormat);
Icon.set('copyformat', copyFormatIcon);
