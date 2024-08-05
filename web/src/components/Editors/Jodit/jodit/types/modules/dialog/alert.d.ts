/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module modules/dialog
 */
import type { IDialog } from "../../types";
/**
 * Show `alert` dialog. Work without Jodit object
 * @example
 * ```javascript
 * Jodit.Alert("File was uploaded");
 * Jodit.Alert("File was uploaded", "Message");
 * Jodit.Alert("File was uploaded", function() {
 *    $('form').hide();
 * });
 * Jodit.Alert("File wasn't uploaded", "Error", function() {
 *    $('form').hide();
 * });
 * ```
 */
export declare function Alert(this: IDialog | unknown, msg: string | HTMLElement, title?: string | (() => void | false), callback?: string | ((dialog: IDialog) => void | false), className?: string): IDialog;
