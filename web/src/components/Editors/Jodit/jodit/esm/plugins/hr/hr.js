/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../core/dom/index.js";
import { pluginSystem } from "../../core/global.js";
import { Icon } from "../../core/ui/icon.js";
import hrIcon from "./hr.svg.js";
import { Config } from "../../config.js";
Icon.set('hr', hrIcon);
Config.prototype.controls.hr = {
    command: 'insertHorizontalRule',
    tags: ['hr'],
    tooltip: 'Insert Horizontal Line'
};
export function hr(editor) {
    editor.registerButton({
        name: 'hr',
        group: 'insert'
    });
    editor.registerCommand('insertHorizontalRule', () => {
        const elm = editor.createInside.element('hr');
        editor.s.insertNode(elm, false, false);
        const block = Dom.closest(elm.parentElement, Dom.isBlock, editor.editor);
        if (block && Dom.isEmpty(block) && block !== editor.editor) {
            Dom.after(block, elm);
            Dom.safeRemove(block);
        }
        let p = Dom.next(elm, Dom.isBlock, editor.editor, false);
        if (!p) {
            p = editor.createInside.element(editor.o.enter);
            Dom.after(elm, p);
        }
        editor.s.setCursorIn(p);
        return false;
    });
}
pluginSystem.add('hr', hr);
