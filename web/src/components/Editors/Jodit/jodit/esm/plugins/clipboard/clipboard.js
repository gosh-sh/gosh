/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { CLIPBOARD_ID, INSERT_AS_HTML, TEXT_HTML, TEXT_PLAIN } from "../../core/constants.js";
import { pluginSystem } from "../../core/global.js";
import { getDataTransfer, stripTags } from "../../core/helpers/index.js";
import "./config.js";
/**
 * Clipboard plugin - cut and copy functionality
 */
export class clipboard {
    constructor() {
        /** @override */
        this.buttons = [
            {
                name: 'cut',
                group: 'clipboard'
            },
            {
                name: 'copy',
                group: 'clipboard'
            },
            {
                name: 'paste',
                group: 'clipboard'
            },
            {
                name: 'selectall',
                group: 'clipboard'
            }
        ];
    }
    init(editor) {
        this.buttons?.forEach(btn => editor.registerButton(btn));
        editor.e
            .off(`copy.${CLIPBOARD_ID} cut.${CLIPBOARD_ID}`)
            .on(`copy.${CLIPBOARD_ID} cut.${CLIPBOARD_ID}`, (event) => {
            const selectedText = editor.s.html;
            const clipboardData = getDataTransfer(event) ||
                getDataTransfer(editor.ew) ||
                getDataTransfer(event.originalEvent);
            if (clipboardData) {
                clipboardData.setData(TEXT_PLAIN, stripTags(selectedText));
                clipboardData.setData(TEXT_HTML, selectedText);
            }
            editor.buffer.set(CLIPBOARD_ID, selectedText);
            editor.e.fire('pasteStack', {
                html: selectedText,
                action: editor.o.defaultActionOnPaste ||
                    INSERT_AS_HTML
            });
            if (event.type === 'cut') {
                editor.s.remove();
                editor.s.focus();
            }
            event.preventDefault();
            editor?.events?.fire('afterCopy', selectedText);
        });
    }
    /** @override */
    destruct(editor) {
        editor?.buffer?.set(CLIPBOARD_ID, '');
        editor?.events?.off('.' + CLIPBOARD_ID);
    }
}
pluginSystem.add('clipboard', clipboard);
