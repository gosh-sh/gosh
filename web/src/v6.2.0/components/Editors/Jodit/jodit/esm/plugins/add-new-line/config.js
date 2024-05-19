/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Icon } from "../../core/ui/icon.js";
import enterIcon from "./enter.svg.js";
import { Config } from "../../config.js";
Config.prototype.addNewLine = true;
Config.prototype.addNewLineOnDBLClick = true;
Config.prototype.addNewLineTagsTriggers = [
    'table',
    'iframe',
    'img',
    'hr',
    'pre',
    'jodit'
];
Config.prototype.addNewLineDeltaShow = 20;
Icon.set('enter', enterIcon);
