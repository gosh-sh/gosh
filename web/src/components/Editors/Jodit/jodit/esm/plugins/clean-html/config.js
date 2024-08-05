/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Icon } from "../../core/ui/icon.js";
import eraserIcon from "./eraser.svg.js";
import { Config } from "../../config.js";
Config.prototype.cleanHTML = {
    timeout: 300,
    removeEmptyElements: true,
    fillEmptyParagraph: true,
    replaceNBSP: true,
    replaceOldTags: {
        i: 'em',
        b: 'strong'
    },
    allowTags: false,
    denyTags: 'script',
    useIframeSandbox: false,
    removeOnError: true,
    safeJavaScriptLink: true,
    disableCleanFilter: null
};
Config.prototype.controls.eraser = {
    command: 'removeFormat',
    tooltip: 'Clear Formatting'
};
Icon.set('eraser', eraserIcon);
