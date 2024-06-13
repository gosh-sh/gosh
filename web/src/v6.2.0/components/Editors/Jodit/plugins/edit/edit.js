/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { pluginSystem } from "../../jodit/esm/core/global.js";
import { findControlType } from "../../jodit/esm/core/ui/helpers/get-control-type.js";

import { Config } from "../../jodit/esm/config.js";

Config.prototype.controls.editMenu = {
    name: 'editMenu',
    text: 'Edit',
    hasTrigger: false,
    data: {
        hasTrigger: false,
    },
    // tooltip: 'File',
    // isDisabled: (editor) => editor.s.isCollapsed(),
    // isActive: (editor) => !editor.s.isCollapsed(),
    defaultValue: [],
    // list: ['editUndo', 'editRedo', '|', 'find', 'find-replace', '\n', 'editPrint'],
    list: [
        'editSelectAll',
        'editCopy',
        'editCut',
        'editPaste',
        '|',
        'editFind',
        'editReplace',
        '\n',
        'editPrint'
    ],
    isChildDisabled: (editor, button) => {},
    update(editor, button) {
        button.state.hasTrigger = false
    },
    childTemplate: (editor, key, value, button) => {
        const control = button.control, icon = button.state.icon;
        // console.log(control);
        // console.log(icon);
        // console.log(button);
        // console.log(value);
        return '<div>' + value + '</div>'
    },
    // list: {
    //     fileImport: 'Import file',
    //     fileImportGoogle: 'Import from Google Disk',
    //     '|': '|',
    //     fileExportAs: 'Export ...',
    //     fileSaveAs: 'Save as PDF',
    // },
    // childTemplate: (editor, key, value) => {
    //     console.log(key)
    //     return key === 'spacer' ? '<hr/>' : '<div>' + value + '</div>'
    // },
    // template: (editor, key, value) => {
    //     console.log(key)
    //     return key === 'spacer' ? '<hr/>' : '<div>' + value + '</div>'
    // },
}

Config.prototype.controls.editUndo = {
    command: 'undo',
    text: 'Undo',
    icon: 'undo',
    // textTemplate: (jodit, value) => "Text",

    template: (editor, key, value, button) => {

        const controls = editor.options.controls ?? {}, getControl = (key) => findControlType(key, controls);
        console.log(controls);
        console.log(key);
        console.log(value);
        console.log(getControl(value));

        return '<div>' + value + '</div>'
    },
    // isActive: false,
    // isDisabled: true,
};
Config.prototype.controls.editCopy = {
    command: 'copy',
    text: 'Copy',
    icon: 'copy',
    template: (editor, key, value, button) => {
        return '<div>' + value + '</div>'
    },
};
Config.prototype.controls.editCut = {
    command: 'cut',
    text: 'Cut',
    icon: 'cut',
    template: (editor, key, value, button) => {
        return '<div>' + value + '</div>'
    },
};
Config.prototype.controls.editPaste = {
    command: 'paste',
    text: 'Paste',
    icon: 'paste',
    template: (editor, key, value, button) => {
        return '<div>' + value + '</div>'
    },
};
Config.prototype.controls.editSelectAll = {
    command: 'selectAll',
    text: 'Select All',
    icon: 'selectall',
    template: (editor, key, value, button) => {
        return '<div>' + value + '</div>'
    },
};
Config.prototype.controls.editRedo = {
    command: 'redo',
    text: 'Redo',
    icon: 'redo',
    template: (editor, key, value, button) => {
        // console.log(button);

        return '<div>' + value + '</div>'
    },
};
Config.prototype.controls.editPrint = {
    ...Config.prototype.controls.print,
    command: 'print',
    text: 'Print',
    isDisabled: () => false,
    template: (editor, key, value) => {
        return `<div style="display: flex; align-items: center; padding-right: 3px;">
        <span style="width: 24px; display: inline-block; padding-left: 2px;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1792 1792" class="jodit-icon_print jodit-icon"> <path d="M448 1536h896v-256h-896v256zm0-640h896v-384h-160q-40 0-68-28t-28-68v-160h-640v640zm1152 64q0-26-19-45t-45-19-45 19-19 45 19 45 45 19 45-19 19-45zm128 0v416q0 13-9.5 22.5t-22.5 9.5h-224v160q0 40-28 68t-68 28h-960q-40 0-68-28t-28-68v-160h-224q-13 0-22.5-9.5t-9.5-22.5v-416q0-79 56.5-135.5t135.5-56.5h64v-544q0-40 28-68t68-28h672q40 0 88 20t76 48l152 152q28 28 48 76t20 88v256h64q79 0 135.5 56.5t56.5 135.5z"></path></svg></span>
        ${value}</div>`;
    },
    // exec: (jodit, _, { control }) => {
    //     jodit.execCommand('print');
    // }
};
Config.prototype.controls.editFind = {
    command: 'find',
    text: 'Find',
    // isActive: false,
    // isDisabled: true,
    template: (editor, key, value) => {
        return `<div style="display: flex; align-items: center; padding-right: 3px;">
        <span style="width: 24px; display: inline-block; padding-left: 0px;"><svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg" class="jodit-icon_search jodit-icon"> <path clip-rule="evenodd" d="M306.39,154.09c19.628,4.543,35.244,21.259,39.787,39.523 c1.551,8.54,8.998,14.989,17.904,14.989c9.991,0,18.168-8.175,18.168-18.17c0-13.083-10.991-32.98-25.985-47.881 c-14.719-14.537-32.252-24.802-46.695-24.802c-9.991,0-18.172,8.45-18.172,18.446C291.396,145.094,297.847,152.546,306.39,154.09z M56.629,392.312c-14.09,14.08-14.09,36.979,0,51.059c14.08,14.092,36.981,14.092,50.965,0l104.392-104.303 c24.347,15.181,53.062,23.991,83.953,23.991c87.857,0,158.995-71.142,158.995-158.999c0-87.854-71.138-158.995-158.995-158.995 c-87.856,0-158.995,71.141-158.995,158.995c0,30.802,8.819,59.606,23.992,83.953L56.629,392.312z M182.371,204.06 c0-62.687,50.875-113.568,113.568-113.568s113.569,50.881,113.569,113.568c0,62.694-50.876,113.569-113.569,113.569 S182.371,266.754,182.371,204.06z" fill-rule="evenodd"></path></svg></span>
        ${value}</div>`;
    },
    exec: (jodit, _, { control }) => {
        jodit.execCommand('openSearchDialog');
    }
};
Config.prototype.controls.editReplace = {
    command: 'replace',
    text: 'Replace',
    // isActive: false,
    // isDisabled: true,
    template: (editor, key, value) => {
        return `<div style="display: flex; align-items: center; padding-right: 3px;">
        <span style="width: 24px; display: inline-block; padding-left: 0px;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" class="jodit-icon_search jodit-icon"><path d="M629.7 343.6L529 444.3c-9.4 9.4-24.6 9.4-33.9 0L394.3 343.6c-9.4-9.4-9.4-24.6 0-33.9l10.8-10.8c9.6-9.6 25.1-9.3 34.4 .5L480 342.1V160H292.5a24 24 0 0 1 -17-7l-16-16C244.4 121.9 255.1 96 276.5 96H520c13.3 0 24 10.7 24 24v222.1l40.4-42.8c9.3-9.8 24.9-10.1 34.4-.5l10.8 10.8c9.4 9.4 9.4 24.6 0 33.9zm-265.1 15.4A24 24 0 0 0 347.5 352H160V169.9l40.4 42.8c9.3 9.8 24.9 10.1 34.4 .5l10.8-10.8c9.4-9.4 9.4-24.6 0-33.9L145 67.7c-9.4-9.4-24.6-9.4-33.9 0L10.3 168.4c-9.4 9.4-9.4 24.6 0 33.9l10.8 10.8c9.6 9.6 25.1 9.3 34.4-.5L96 169.9V392c0 13.3 10.7 24 24 24h243.5c21.4 0 32.1-25.9 17-41l-16-16z"/></svg></span>
        ${value}</div>`;
    },
    exec: (jodit, _, { control }) => {
        jodit.execCommand('openReplaceDialog');
    }
};

/**
 * Process commands: `uppercase`, `lowercase`, `capitalizedcase`
 */
export function editMenu(editor) {
    editor.registerButton({
        name: 'editMenu',
        group: 'main'
    });
    const callback = (command) => {
        const range = editor.s.createRange();
        editor.s.insertHTML(changeHtmlCase(editor.s.html, command));
        editor.s.remove();
        editor.s.selectRange(range);
        return true;
    };
    editor.registerCommand('edit_undo', callback);
    editor.registerCommand('edit_redo', callback);
    editor.registerCommand('edit_cut', callback);
    editor.registerCommand('edit_copy', callback);
    editor.registerCommand('edit_paste', callback);
    editor.registerCommand('edit_print', callback);
    editor.registerCommand('edit_find', callback);
    editor.registerCommand('edit_find_replace', callback);
    editor.registerCommand('edit_source', callback);
}
pluginSystem.add('editMenu', editMenu);
