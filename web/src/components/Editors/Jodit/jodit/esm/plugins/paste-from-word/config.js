/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { INSERT_AS_HTML, INSERT_AS_TEXT, INSERT_ONLY_TEXT } from "../../core/constants.js";
import { Config } from "../../config.js";
Config.prototype.askBeforePasteFromWord = true;
Config.prototype.processPasteFromWord = true;
Config.prototype.defaultActionOnPasteFromWord = null;
Config.prototype.pasteFromWordActionList = [
    { value: INSERT_AS_HTML, text: 'Keep' },
    { value: INSERT_AS_TEXT, text: 'Clean' },
    { value: INSERT_ONLY_TEXT, text: 'Insert only Text' }
];
