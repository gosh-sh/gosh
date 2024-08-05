/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { isArray } from "../../../core/helpers/checker/is-array.js";
import { position } from "../../../core/helpers/size/position.js";
import { Popup } from "../../../core/ui/popup/popup.js";
import { FileSelectorWidget } from "../../../modules/widget/file-selector/file-selector.js";
/** @private */
export function openImagePopup(j, dialog, state, button) {
    const popup = new Popup(dialog);
    const closePopup = () => {
        popup.close();
        popup.destruct();
    };
    popup
        .setContent(FileSelectorWidget(j, {
        upload: (data) => {
            if (data.files && data.files.length) {
                state.values.imageSrc =
                    data.baseurl + data.files[0];
            }
            closePopup();
        },
        filebrowser: async (data) => {
            if (data && isArray(data.files) && data.files.length) {
                state.values.imageSrc = data.files[0];
                closePopup();
            }
        }
    }, state.image, closePopup))
        .open(() => position(button));
}
