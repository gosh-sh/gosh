/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../core/dom/index.js";
import { pluginSystem } from "../../core/global.js";
import { Config } from "../../config.js";
/**
 * After loading the page into the editor once the focus is set
 */
Config.prototype.autofocus = false;
/**
 * Cursor position after autofocus
 */
Config.prototype.cursorAfterAutofocus = 'end';
/**
 * Save current selection on blur event
 */
Config.prototype.saveSelectionOnBlur = true;
export function focus(editor) {
    if (editor.o.saveSelectionOnBlur) {
        editor.e
            .on('blur', () => {
            if (editor.isEditorMode()) {
                editor.s.save(true);
            }
        })
            .on('focus', () => {
            editor.s.restore();
        });
    }
    const focus = () => {
        editor.s.focus();
        if (editor.o.cursorAfterAutofocus === 'end') {
            const lastTextNode = Dom.last(editor.editor, node => Dom.isText(node));
            if (lastTextNode) {
                editor.s.setCursorIn(lastTextNode, false);
            }
        }
    };
    editor.e.on('afterInit', () => {
        if (editor.o.autofocus) {
            if (editor.defaultTimeout) {
                editor.async.setTimeout(focus, 300);
            }
            else {
                focus();
            }
        }
    });
    editor.e.on('afterInit afterAddPlace', () => {
        editor.e
            .off(editor.editor, 'mousedown.autofocus')
            .on(editor.editor, 'mousedown.autofocus', (e) => {
            if (editor.isEditorMode() &&
                e.target &&
                Dom.isBlock(e.target) &&
                !e.target.childNodes.length) {
                if (editor.editor === e.target) {
                    editor.s.focus();
                }
                else {
                    editor.s.setCursorIn(e.target);
                }
            }
        });
    });
}
pluginSystem.add('focus', focus);
