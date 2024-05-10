/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../core/dom/index.js";
import { Icon } from "../../core/ui/icon.js";
import paragraphIcon from "./paragraph.svg.js";
import { Config } from "../../config.js";
Icon.set('paragraph', paragraphIcon);
Config.prototype.controls.paragraph = {
    command: 'formatBlock',
    value(editor, button) {
        const control = button.control, current = editor.s.current();
        const currentBox = Dom.closest(current, Dom.isBlock, editor.editor);
        return currentBox?.nodeName.toLowerCase() ?? control.data?.currentValue;
    },
    update(editor, button) {
        const control = button.control, current = editor.s.current();
        if (!current) {
            return false;
        }
        const currentValue = button.state.value, list = control.list;
        if (list && list[currentValue.toString()]) {
            if (editor.o.textIcons) {
                button.state.text = list[currentValue.toString()].toString();
            }
        }
        return false;
    },
    data: {
        currentValue: 'p'
    },
    list: {
        p: 'Paragraph',
        h1: 'Heading 1',
        h2: 'Heading 2',
        h3: 'Heading 3',
        h4: 'Heading 4',
        blockquote: 'Quote',
        pre: 'Code'
    },
    isChildActive: (editor, button) => {
        return Boolean(button.state.value === button.control?.args?.[0]);
    },
    isActive: (editor, button) => {
        return (button.state.value !== editor.o.enter &&
            Boolean(button.control.list?.[button.state.value]));
    },
    childTemplate: (e, key, value) => `<${key} style="margin:0;padding:0"><span>${e.i18n(value)}</span></${key}>`,
    tooltip: 'Insert format block'
};
