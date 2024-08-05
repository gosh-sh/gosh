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
 * Show `Prompt` dialog. Work without Jodit object
 *
 * @param msg - Dialog content
 * @param title - Title or callback
 * @param callback - callback. The first argument is the value entered
 * @param placeholder - Placeholder for input
 * @example
 * ```javascript
 * Jodit.Prompt("Enter your name", "Prompt Dialog", function (name) {
 *     if (name.length < 3) {
 *         Jodit.Alert("The name must be at least 3 letters");
 *         return false;
 *     }
 *     // do something
 * });
 * ```
 */
export declare function Prompt(this: IDialog | unknown, msg: string, title: string | (() => false | void) | undefined, callback: (value: string) => false | void, placeholder?: string, defaultValue?: string): IDialog;
