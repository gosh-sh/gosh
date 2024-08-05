/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { MODE_SOURCE, MODE_WYSIWYG } from "../../core/constants.js";
import { pluginSystem } from "../../core/global.js";
import { previewBox } from "../../core/helpers/utils/print.js";
import { Config } from "../../config.js";
Config.prototype.controls.preview = {
    icon: 'eye',
    command: 'preview',
    mode: MODE_SOURCE + MODE_WYSIWYG,
    tooltip: 'Preview'
};
export function preview(editor) {
    editor.registerButton({
        name: 'preview'
    });
    editor.registerCommand('preview', (_, _1, defaultValue) => {
        const dialog = editor.dlg();
        dialog
            .setSize(1024, 600)
            .open('', editor.i18n('Preview'))
            .setModal(true);
        const [, onDestrcut] = previewBox(editor, defaultValue, 'px', dialog.getElm('content'));
        dialog.e.on(dialog, 'afterClose', onDestrcut);
    });
}
pluginSystem.add('preview', preview);
