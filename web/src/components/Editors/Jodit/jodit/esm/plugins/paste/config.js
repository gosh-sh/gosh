/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { CLIPBOARD_ID, INSERT_AS_HTML, INSERT_AS_TEXT, INSERT_ONLY_TEXT, IS_PROD, TEXT_PLAIN } from "../../core/constants.js";
import { pasteInsertHtml } from "./helpers.js";
import { Config } from "../../config.js";
Config.prototype.askBeforePasteHTML = true;
Config.prototype.processPasteHTML = true;
Config.prototype.scrollToPastedContent = true;
Config.prototype.pasteExcludeStripTags = ['br', 'hr'];
Config.prototype.pasteHTMLActionList = [
    { value: INSERT_AS_HTML, text: 'Keep' },
    { value: INSERT_AS_TEXT, text: 'Insert as Text' },
    { value: INSERT_ONLY_TEXT, text: 'Insert only Text' }
];
Config.prototype.memorizeChoiceWhenPasteFragment = false;
Config.prototype.nl2brInPlainText = true;
const psKey = 'pasteStorage';
Config.prototype.controls.paste = {
    tooltip: 'Paste from clipboard',
    async exec(editor, _, { control }) {
        if (control.name === psKey) {
            editor.execCommand('showPasteStorage');
            return;
        }
        editor.s.focus();
        let text = '', error = true;
        if (navigator.clipboard) {
            try {
                const items = await navigator.clipboard.read();
                if (items && items.length) {
                    const textBlob = await items[0].getType(TEXT_PLAIN);
                    text = await new Response(textBlob).text();
                }
                error = false;
            }
            catch (e) {
                if (!IS_PROD) {
                    // eslint-disable-next-line no-console
                    console.log(e);
                }
            }
            if (error) {
                try {
                    text = await navigator.clipboard.readText();
                    error = false;
                }
                catch (e) {
                    if (!IS_PROD) {
                        // eslint-disable-next-line no-console
                        console.log(e);
                    }
                }
            }
        }
        if (error) {
            text = editor.buffer.get(CLIPBOARD_ID) || '';
            error = text.length === 0;
        }
        const value = editor.value;
        if (error) {
            editor.ed.execCommand('paste');
            error = value === editor.value;
            !error && editor.e.fire('afterPaste');
        }
        else if (text.length) {
            pasteInsertHtml(null, editor, text);
            editor.e.fire('afterPaste');
        }
        else {
            if (error) {
                editor.alert("Your browser doesn't support direct access to the clipboard.", () => void editor.s.focus());
            }
        }
    },
    list: {
        [psKey]: 'Paste Storage'
    },
    isChildDisabled(j) {
        return j.e.fire('pasteStorageList') < 2;
    }
};
