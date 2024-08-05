/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { isHTML, isString } from "../helpers/checker/index.js";
import { markOwner } from "../helpers/utils/utils.js";
import { Alert, Confirm, Dialog, Prompt } from "../../modules/dialog/index.js";
export class Dlgs {
    dlg(options) {
        const dialog = new Dialog({
            language: this.o.language,
            shadowRoot: this.o.shadowRoot,
            ownerWindow: this.o.ownerWindow,
            defaultTimeout: this.o.defaultTimeout,
            theme: this.o.theme,
            globalFullSize: this.o.globalFullSize,
            ...options
        });
        markOwner(this, dialog.container);
        dialog.parent = this;
        return dialog.bindDestruct(this);
    }
    confirm(msg, title, callback) {
        msg = processTitle(msg, this);
        title = processTitle(title, this);
        return Confirm.call(this.dlg({ closeOnClickOverlay: true }), msg, title, callback);
    }
    prompt(msg, title, callback, placeholder, defaultValue) {
        msg = processTitle(msg, this);
        title = processTitle(title, this);
        placeholder = processTitle(placeholder, this);
        return Prompt.call(this.dlg({ closeOnClickOverlay: true }), msg, title, callback, placeholder, defaultValue);
    }
    alert(msg, title, callback, className) {
        msg = processTitle(msg, this);
        title = processTitle(title, this);
        return Alert.call(this.dlg({ closeOnClickOverlay: true }), msg, title, callback, className);
    }
}
function processTitle(title, self) {
    if (isString(title) && !isHTML(title)) {
        title = self.i18n(title);
    }
    return title;
}
