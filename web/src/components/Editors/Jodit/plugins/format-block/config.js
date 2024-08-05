/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */

import { Config } from "../../jodit/esm/config.js";

Config.prototype.controls.paragraphpro = {
    ...Config.prototype.controls.paragraph,
    command: 'formatBlockPro',
    name: "Formatting",
    update(editor, button) {
        const control = button.control, current = editor.s.current();
        if (!current) {
            return false;
        }
        const currentValue = button.state.value, list = control.list;
        if (list && list[currentValue.toString()]) {
            if (editor.o.textIcons || true) {
                button.state.text = list[currentValue.toString()].toString();
            }
        }
        return false;
    },
    template: (editor, key, value) => {
        return `<span data-style="${key}" style='width: 70px !important; text-align: left; text-overflow: ellipsis; overflow: hidden; text-wrap: nowrap;'}'>${value}</span>`;
    },
    childTemplate: (e, key, value) => `<${key} style="${key == "blockquote" ? 'margin:0;padding:0 0 0 5px;' : 'margin:0;padding:0'}"><span>${e.i18n(value)}</span></${key}>`,
};
