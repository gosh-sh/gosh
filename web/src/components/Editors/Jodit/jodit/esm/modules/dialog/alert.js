/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../core/dom/dom.js";
import { asArray } from "../../core/helpers/array/as-array.js";
import { isFunction } from "../../core/helpers/checker/is-function.js";
import { Button } from "../../core/ui/button/button/button.js";
import { Dialog } from "./dialog.js";
/**
 * Show `alert` dialog. Work without Jodit object
 * @example
 * ```javascript
 * Jodit.Alert("File was uploaded");
 * Jodit.Alert("File was uploaded", "Message");
 * Jodit.Alert("File was uploaded", function() {
 *    $('form').hide();
 * });
 * Jodit.Alert("File wasn't uploaded", "Error", function() {
 *    $('form').hide();
 * });
 * ```
 */
export function Alert(msg, title, callback, className = 'jodit-dialog_alert') {
    if (isFunction(title)) {
        callback = title;
        title = undefined;
    }
    const dialog = this instanceof Dialog
        ? this
        : new Dialog({ closeOnClickOverlay: true }), container = dialog.c.div(className), okButton = Button(dialog, 'ok', 'Ok');
    asArray(msg).forEach(oneMessage => {
        container.appendChild(Dom.isNode(oneMessage) ? oneMessage : dialog.c.fromHTML(oneMessage));
    });
    okButton.onAction(() => {
        if (!callback || !isFunction(callback) || callback(dialog) !== false) {
            dialog.close();
        }
    });
    dialog.setFooter([okButton]);
    dialog.open(container, title || '&nbsp;', true, true);
    okButton.focus();
    return dialog;
}
