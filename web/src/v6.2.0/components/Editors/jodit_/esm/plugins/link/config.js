/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../core/dom/dom.js";
import { Icon } from "../../core/ui/icon.js";
import linkIcon from "./icons/link.svg.js";
import unlinkIcon from "./icons/unlink.svg.js";
import { formTemplate } from "./template.js";
import { Config } from "../../config.js";
Config.prototype.link = {
    formTemplate,
    followOnDblClick: false,
    processVideoLink: true,
    processPastedLink: true,
    noFollowCheckbox: true,
    openInNewTabCheckbox: true,
    modeClassName: 'input',
    selectMultipleClassName: true,
    selectSizeClassName: 3,
    selectOptionsClassName: [],
    hotkeys: ['ctrl+k', 'cmd+k']
};
Icon.set('link', linkIcon).set('unlink', unlinkIcon);
Config.prototype.controls.unlink = {
    exec: (editor, current) => {
        const anchor = Dom.closest(current, 'a', editor.editor);
        if (anchor) {
            Dom.unwrap(anchor);
        }
        editor.synchronizeValues();
        editor.e.fire('hidePopup');
    },
    tooltip: 'Unlink'
};
Config.prototype.controls.link = {
    isActive: (editor) => {
        const current = editor.s.current();
        return Boolean(current && Dom.closest(current, 'a', editor.editor));
    },
    popup: (editor, current, close) => {
        return editor.e.fire('generateLinkForm.link', current, close);
    },
    tags: ['a'],
    tooltip: 'Insert link'
};
