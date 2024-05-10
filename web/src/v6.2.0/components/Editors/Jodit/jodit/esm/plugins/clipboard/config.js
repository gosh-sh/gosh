/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Icon } from "../../core/ui/icon.js";
import copyIcon from "./icons/copy.svg.js";
import cutIcon from "./icons/cut.svg.js";
import pasteIcon from "./icons/paste.svg.js";
import selectAllIcon from "./icons/select-all.svg.js";
import { Config } from "../../config.js";
Config.prototype.controls.cut = {
    command: 'cut',
    isDisabled: (editor) => editor.s.isCollapsed(),
    tooltip: 'Cut selection'
};
Config.prototype.controls.copy = {
    command: 'copy',
    isDisabled: (editor) => editor.s.isCollapsed(),
    tooltip: 'Copy selection'
};
Config.prototype.controls.selectall = {
    icon: 'select-all',
    command: 'selectall',
    tooltip: 'Select all'
};
Icon.set('copy', copyIcon)
    .set('cut', cutIcon)
    .set('paste', pasteIcon)
    .set('select-all', selectAllIcon);
