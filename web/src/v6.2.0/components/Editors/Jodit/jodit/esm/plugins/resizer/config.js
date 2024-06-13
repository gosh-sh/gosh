/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Config } from "../../config.js";
Config.prototype.allowResizeTags = new Set(['img', 'iframe', 'table', 'jodit']);
Config.prototype.resizer = {
    showSize: true,
    hideSizeTimeout: 1000,
    forImageChangeAttributes: true,
    min_width: 10,
    min_height: 10,
    useAspectRatio: new Set(['img'])
};
