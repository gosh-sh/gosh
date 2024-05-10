/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import * as consts from "../../core/constants.js";
import { Icon } from "../../core/ui/icon.js";
import fullsizeIcon from "./icons/fullsize.svg.js";
import shrinkIcon from "./icons/shrink.svg.js";
import { Config } from "../../config.js";
Config.prototype.fullsize = false;
Config.prototype.globalFullSize = true;
Icon.set('fullsize', fullsizeIcon).set('shrink', shrinkIcon);
Config.prototype.controls.fullsize = {
    exec: (editor) => {
        editor.toggleFullSize();
    },
    update(editor, button) {
        const mode = editor.isFullSize ? 'shrink' : 'fullsize';
        button.state.activated = editor.isFullSize;
        if (editor.o.textIcons) {
            button.state.text = mode;
        }
        else {
            button.state.icon.name = mode;
        }
    },
    tooltip: 'Open in fullsize',
    mode: consts.MODE_SOURCE + consts.MODE_WYSIWYG
};
