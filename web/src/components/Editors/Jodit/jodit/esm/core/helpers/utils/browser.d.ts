/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module helpers/utils
 */
/**
 * Module returns method that is used to determine the browser
 * @example
 * ```javascript
 * console.log(Jodit.modules.Helpers.browser('mse'));
 * console.log(Jodit.modules.Helpers.browser('chrome'));
 * console.log($Jodit.modules.Helpers.browser('opera'));
 * console.log(Jodit.modules.Helpers.browser('firefox'));
 * console.log(Jodit.modules.Helpers.browser('mse') && Jodit.modules.Helpers.browser('version') > 10);
 * ```
 */
export declare const browser: (browser: string) => boolean | string;
