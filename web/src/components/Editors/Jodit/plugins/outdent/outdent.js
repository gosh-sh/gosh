/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */

import { Config } from "../../jodit/esm/config.js";
import { Dom } from "../../jodit/esm/core/dom/index.js";
import { getKey } from "../../jodit/esm/plugins/indent/helpers.js";

Config.prototype.controls.outdent = {
    isDisabled: (editor) => {
        const current = editor.s.current();
        if (current) {
            const currentBox = Dom.closest(current, Dom.isBlock, editor.editor);
            if (currentBox) {
                const arrow = getKey(editor.o.direction, currentBox);
                const tag = currentBox.tagName.toLowerCase();
                return (!currentBox.style[arrow] ||
                    parseInt(currentBox.style[arrow], 10) <= 0) && tag !== "li" && tag !== "ol" && tag !== "ul";
            }
        }
        return true;
    }
};
