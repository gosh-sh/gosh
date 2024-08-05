/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../../../core/dom/index.js";
import { isString } from "../../../../core/helpers/checker/is-string.js";
import { hAlignElement } from "../../../../core/helpers/utils/align.js";
import { css } from "../../../../core/helpers/utils/css.js";
export const align = {
    name: 'left',
    childTemplate: (_, __, value) => value,
    list: ['Left', 'Right', 'Center', 'Normal'],
    exec: (editor, elm, { control }) => {
        if (!Dom.isTag(elm, new Set(['img', 'jodit', 'jodit-media']))) {
            return;
        }
        const command = control.args && isString(control.args[0])
            ? control.args[0].toLowerCase()
            : '';
        if (!command) {
            return false;
        }
        hAlignElement(elm, command);
        if (Dom.isTag(elm, new Set(['jodit', 'jodit-media'])) &&
            elm.firstElementChild) {
            hAlignElement(elm.firstElementChild, command);
        }
        editor.synchronizeValues();
        editor.e.fire('recalcPositionPopup');
    },
    tooltip: 'Horizontal align'
};
export default [
    {
        name: 'delete',
        icon: 'bin',
        tooltip: 'Delete',
        exec: (editor, image) => {
            image && editor.s.removeNode(image);
        }
    },
    {
        name: 'pencil',
        exec(editor, current) {
            const tagName = current.tagName.toLowerCase();
            if (tagName === 'img') {
                editor.e.fire('openImageProperties', current);
            }
        },
        tooltip: 'Edit'
    },
    {
        name: 'valign',
        list: ['Top', 'Middle', 'Bottom', 'Normal'],
        tooltip: 'Vertical align',
        exec: (editor, image, { control }) => {
            if (!Dom.isTag(image, 'img')) {
                return;
            }
            const command = control.args && isString(control.args[0])
                ? control.args[0].toLowerCase()
                : '';
            if (!command) {
                return false;
            }
            css(image, 'vertical-align', command === 'normal' ? '' : command);
            editor.e.fire('recalcPositionPopup');
        }
    },
    align
];
