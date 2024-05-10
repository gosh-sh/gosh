/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { isFunction } from "../../core/helpers/checker/is-function.js";
import { Button } from "../../core/ui/button/button/button.js";
import { Dialog } from "./dialog.js";
/**
 * Show `confirm` dialog. Work without Jodit object
 *
 * @param title - Title or callback
 * @param callback - callback. The first argument is the value entered
 * @example
 * ```javascript
 * Jodit.Confirm("Are you sure?", "Confirm Dialog", function (yes) {
 *     if (yes) {
 *         // do something
 *     }
 * });
 * ```
 */
export function Confirm(msg, title, callback) {
    const dialog = this instanceof Dialog
        ? this
        : new Dialog({ closeOnClickOverlay: true }), $div = dialog.c.fromHTML('<form class="jodit-dialog_prompt"></form>'), $label = dialog.c.element('label');
    if (isFunction(title)) {
        callback = title;
        title = undefined;
    }
    $label.appendChild(dialog.c.fromHTML(msg));
    $div.appendChild($label);
    const action = (yes) => () => {
        if (!callback || callback(yes) !== false) {
            dialog.close();
        }
    };
    const $cancel = Button(dialog, 'cancel', 'Cancel');
    const $ok = Button(dialog, 'ok', 'Yes');
    $cancel.onAction(action(false));
    $ok.onAction(action(true));
    dialog.e.on($div, 'submit', () => {
        action(true)();
        return false;
    });
    dialog.setFooter([$ok, $cancel]);
    dialog.open($div, title || '&nbsp;', true, true);
    $ok.focus();
    return dialog;
}
