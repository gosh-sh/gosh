/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import * as consts from "../../core/constants.js";
import { Dom } from "../../core/dom/index.js";
import { getContainer, pluginSystem } from "../../core/global.js";
import { defaultLanguage } from "../../core/helpers/utils/default-language.js";
import { previewBox } from "../../core/helpers/utils/print.js";
import { Icon } from "../../core/ui/icon.js";
import { generateCriticalCSS } from "./lib/generate-critical-css.js";
import printIcon from "./print.svg.js";
import { Config } from "../../config.js";
Icon.set('print', printIcon);
Config.prototype.controls.print = {
    exec: (editor) => {
        const iframe = editor.create.element('iframe');
        Object.assign(iframe.style, {
            position: 'fixed',
            right: 0,
            bottom: 0,
            width: 0,
            height: 0,
            border: 0
        });
        getContainer(editor, Config).appendChild(iframe);
        const afterFinishPrint = () => {
            editor.e.off(editor.ow, 'mousemove', afterFinishPrint);
            Dom.safeRemove(iframe);
        };
        const myWindow = iframe.contentWindow;
        if (myWindow) {
            editor.e
                .on(myWindow, 'onbeforeunload onafterprint', afterFinishPrint)
                .on(editor.ow, 'mousemove', afterFinishPrint);
            if (editor.o.iframe) {
                editor.e.fire('generateDocumentStructure.iframe', myWindow.document, editor);
                myWindow.document.body.innerHTML = editor.value;
            }
            else {
                myWindow.document.write('<!doctype html><html lang="' +
                    defaultLanguage(editor.o.language) +
                    '"><head><title></title></head><style>' +
                    generateCriticalCSS(editor) +
                    '</style><body></body></html>');
                myWindow.document.close();
                previewBox(editor, undefined, 'px', myWindow.document.body);
            }
            const style = myWindow.document.createElement('style');
            style.innerHTML = `@media print {
					body {
							-webkit-print-color-adjust: exact;
					}
			}`;
            myWindow.document.head.appendChild(style);
            myWindow.focus();
            myWindow.print();
        }
    },
    mode: consts.MODE_SOURCE + consts.MODE_WYSIWYG,
    tooltip: 'Print'
};
export function print(editor) {
    editor.registerButton({
        name: 'print'
    });
}
pluginSystem.add('print', print);
