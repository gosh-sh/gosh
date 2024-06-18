/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Config } from "../../config.js";
Config.prototype.wrapNodes = {
    exclude: new Set(['hr', 'style', 'br']),
    emptyBlockAfterInit: true
};
