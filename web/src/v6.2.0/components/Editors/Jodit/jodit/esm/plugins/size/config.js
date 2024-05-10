/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/size
 */
import { Config } from "../../config.js";
Config.prototype.minWidth = 200;
Config.prototype.maxWidth = '100%';
/**
 * Editor's min-height
 *
 * @example
 * ```javascript
 * Jodit.make('.editor', {
 *    minHeight: '30%' //min-height: 30%
 * })
 * ```
 * @example
 * ```javascript
 * Jodit.make('.editor', {
 *    minHeight: 200 //min-height: 200px
 * })
 * ```
 */
Config.prototype.minHeight = 200;
Config.prototype.maxHeight = 'auto';
/**
 * if set true and height !== auto then after reload editor will have the latest height
 */
Config.prototype.saveHeightInStorage = false;
