/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../core/dom/dom.js";
import { pluginSystem } from "../../core/global.js";
import { alignElement } from "../../core/helpers/utils/align.js";
import { css } from "../../core/helpers/utils/css.js";
import { Icon } from "../../core/ui/icon.js";
import justifyIcon from "./justify.svg.js";
import { Config } from "../../config.js";
Icon.set('justify', justifyIcon);
Config.prototype.controls.align = {
    name: 'left',
    tooltip: 'Align',
    update(editor, button) {
        const control = button.control, current = editor.s.current();
        if (current) {
            const currentBox = Dom.closest(current, Dom.isBlock, editor.editor) ||
                editor.editor;
            let currentValue = css(currentBox, 'text-align').toString();
            if (control.defaultValue &&
                control.defaultValue.indexOf(currentValue) !== -1) {
                currentValue = 'left';
            }
            if (control.data &&
                control.data.currentValue !== currentValue &&
                control.list &&
                control.list[currentValue]) {
                if (editor.o.textIcons || control.component === 'select') {
                    button.state.text = currentValue;
                }
                else {
                    button.state.icon.name = currentValue;
                }
                control.data.currentValue = currentValue;
            }
        }
    },
    isActive: (editor, btn) => {
        const current = editor.s.current();
        if (!current || !btn.control.defaultValue) {
            return false;
        }
        const currentBox = Dom.closest(current, Dom.isBlock, editor.editor) ||
            editor.editor;
        return (btn.control.defaultValue.indexOf(css(currentBox, 'text-align').toString()) === -1);
    },
    defaultValue: ['left', 'start', 'inherit'],
    data: {
        currentValue: 'left'
    },
    list: ['center', 'left', 'right', 'justify']
};
Config.prototype.controls.center = {
    command: 'justifyCenter',
    css: {
        'text-align': 'center'
    },
    tooltip: 'Align Center'
};
Config.prototype.controls.justify = {
    command: 'justifyFull',
    css: {
        'text-align': 'justify'
    },
    tooltip: 'Align Justify'
};
Config.prototype.controls.left = {
    command: 'justifyLeft',
    css: {
        'text-align': 'left'
    },
    tooltip: 'Align Left'
};
Config.prototype.controls.right = {
    command: 'justifyRight',
    css: {
        'text-align': 'right'
    },
    tooltip: 'Align Right'
};
/**
 * Process commands: `justifyfull`, `justifyleft`, `justifyright`, `justifycenter`
 */
export function justify(editor) {
    editor.registerButton({
        name: 'align',
        group: 'indent'
    });
    const callback = (command) => {
        editor.s.focus();
        editor.s.eachSelection((current) => {
            if (!current) {
                return;
            }
            let currentBox = Dom.up(current, Dom.isBlock, editor.editor);
            if (!currentBox) {
                currentBox = Dom.wrapInline(current, editor.o.enterBlock, editor);
            }
            alignElement(command, currentBox);
        });
        return false;
    };
    editor.registerCommand('justifyfull', callback);
    editor.registerCommand('justifyright', callback);
    editor.registerCommand('justifyleft', callback);
    editor.registerCommand('justifycenter', callback);
}
pluginSystem.add('justify', justify);
