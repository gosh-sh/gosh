/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { pluginSystem } from "../../jodit/esm/core/global.js";

import { Config } from "../../jodit/esm/config.js";

Config.prototype.controls.fileMenu = {
    name: 'fileMenu',
    text: 'File',
    hasTrigger: false,
    data: {
        hasTrigger: false,
    },
    list: {
        'fileImport': 'fileImport',
        'fileImportGoogle': 'fileImportGoogle',
        '|': '|',
        'fileExportAs': 'fileExportAs',
        'fileSaveAsPDF': 'fileSaveAsPDF',
        // '\n': '\n',
        // 'fileShare': 'fileShare',
    },
    update(editor, button) {
        button.state.hasTrigger = false
    },
    isChildActive: (editor, button) => false,
    isChildDisabled: (editor, button) => true,

}

Config.prototype.controls.fileImport = {
    command: 'file_import',
    text: 'Import file',
    // isActive: () => true,
    isDisabled: () => false,
    template: (editor, key, value) => {
        return `<div style="display: flex; align-items: center; padding-right: 3px;">
        <span style="width: 24px; display: inline-block; padding-left: 0px;"><svg xmlns="http://www.w3.org/2000/svg" style="margin-right: 9px; width: 15px;" viewBox="0 0 512 512"><!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M16 288c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h112v-64zm489-183L407.1 7c-4.5-4.5-10.6-7-17-7H384v128h128v-6.1c0-6.3-2.5-12.4-7-16.9zm-153 31V0H152c-13.3 0-24 10.7-24 24v264h128v-65.2c0-14.3 17.3-21.4 27.4-11.3L379 308c6.6 6.7 6.6 17.4 0 24l-95.7 96.4c-10.1 10.1-27.4 3-27.4-11.3V352H128v136c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H376c-13.2 0-24-10.8-24-24z"/></svg></span>
        ${value}</div>`;
    },
    exec: (jodit, _, { control }) => {

        // Fire custom event, assuming Jodit supports custom events like this
        jodit.events.fire('importFile', { hello: 'world' });

        // If Jodit does not dispatch events to the document by default,
        // manually dispatch it:
        const event = new CustomEvent('importFile', { detail: { hello: 'world' } });
        document.dispatchEvent(event);
    }
};
Config.prototype.controls.fileImportGoogle = {
    command: 'file_import_google',
    text: 'Import from Google Disk',
    isDisabled: () => true,
    template: (editor, key, value) => {
        return `<div style="display: flex; align-items: center; padding-right: 3px;">
            <span style="width: 24px; display: inline-block; padding-left: 0px;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 87.3 78" style="margin-left: 1px; margin-right: 6px; width: 16px;" >
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
            </svg></span>
        ${value}</div>`
    },
    exec: (jodit, _, { control }) => {
    }
}
Config.prototype.controls.fileExportAs = {
    command: 'file_export_as',
    text: 'Export ...',
    isDisabled: () => true,
    template: (editor, key, value) => {
        return `<div style="display: flex; align-items: center; padding-right: 3px;">
        <i class="jodit_icon jodit_icon_image"></i>
        ${value}</div>`
    },
    exec: (jodit, _, { control }) => {
    }
};
Config.prototype.controls.fileSaveAsPDF = {
    command: 'file_save_as_pdf',
    text: 'Save as PDF',
    isDisabled: () => true,

    exec: (jodit, _, { control }) => {
    }
};

/**
 * Process commands: `uppercase`, `lowercase`, `capitalizedcase`
 */
export function fileMenu(editor) {
    editor.registerButton({
        name: 'fileMenu',
        group: 'main'
    });

    editor.registerButton({
        name: 'fileImport',
        group: 'fileMenu'
    });
    editor.registerButton({
        name: 'fileImportGoogle',
        group: 'fileMenu'
    });
    // const callback = (command) => {
    //     const range = editor.s.createRange();
    //     // editor.s.insertHTML(changeHtmlCase(editor.s.html, command));
    //     editor.s.remove();
    //     editor.s.selectRange(range);
    //     return true;
    // };
    // editor.registerCommand('file_import', callback);
    // editor.registerCommand('file_saveas', callback);
    // editor.registerCommand('file_share', callback);
}
pluginSystem.add('fileMenu', fileMenu);
