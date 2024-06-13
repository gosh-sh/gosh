/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { isJoditObject, isString } from "../../../../core/helpers/checker/index.js";
import { css } from "../../../../core/helpers/utils/css.js";
const cmd = (control) => control.args && isString(control.args[0])
    ? control.args[0].toLowerCase()
    : '';
export default [
    'brushCell',
    {
        name: 'valign',
        list: ['Top', 'Middle', 'Bottom', 'Normal'],
        childTemplate: (_, __, value) => value,
        exec: (editor, table, { control }) => {
            const command = cmd(control);
            editor
                .getInstance('Table', editor.o)
                .getAllSelectedCells()
                .forEach((cell) => {
                css(cell, 'vertical-align', command === 'normal' ? '' : command);
            });
        },
        tooltip: 'Vertical align'
    },
    {
        name: 'splitv',
        list: {
            tablesplitv: 'Split vertical',
            tablesplitg: 'Split horizontal'
        },
        tooltip: 'Split'
    },
    {
        name: 'align',
        icon: 'left'
    },
    '\n',
    {
        name: 'merge',
        command: 'tablemerge',
        tooltip: 'Merge'
    },
    {
        name: 'addcolumn',
        list: {
            tableaddcolumnbefore: 'Insert column before',
            tableaddcolumnafter: 'Insert column after'
        },
        exec: (editor, table, { control }) => {
            if (!isJoditObject(editor)) {
                return;
            }
            if (!control.args) {
                return false;
            }
            const command = cmd(control);
            editor.execCommand(command, false, table);
        },
        tooltip: 'Add column'
    },
    {
        name: 'addrow',
        list: {
            tableaddrowbefore: 'Insert row above',
            tableaddrowafter: 'Insert row below'
        },
        exec: (editor, table, { control }) => {
            if (!isJoditObject(editor)) {
                return;
            }
            if (!control.args) {
                return false;
            }
            const command = cmd(control);
            editor.execCommand(command, false, table);
        },
        tooltip: 'Add row'
    },
    {
        name: 'delete',
        icon: 'bin',
        list: {
            tablebin: 'Delete table',
            tablebinrow: 'Delete row',
            tablebincolumn: 'Delete column',
            tableempty: 'Empty cell'
        },
        exec: (editor, table, { control }) => {
            if (!isJoditObject(editor)) {
                return;
            }
            if (!control.args) {
                return false;
            }
            const command = cmd(control);
            editor.execCommand(command, false, table);
            editor.e.fire('hidePopup');
        },
        tooltip: 'Delete'
    }
];
