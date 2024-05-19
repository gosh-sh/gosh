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
 * Show `confirm` dialog. Work without Jodit object
 *
 * @param title - Title or callback
 * @param callback - callback. The first argument is the value entered
 * @example
 * ```javascript
 * Jodit.Confirm("Are you sure?", "Confirm Dialog", function (yes) {
 *     if (yes) {
 *         // do something
 *     }
 * });
 * ```
 */
export declare function Confirm(this: IDialog | unknown, msg: string, title: string | ((yes: boolean) => void) | undefined, callback?: (yes: boolean) => void | false): IDialog;
