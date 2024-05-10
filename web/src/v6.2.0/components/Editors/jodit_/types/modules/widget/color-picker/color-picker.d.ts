/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:modules/widget/color-picker/README.md]]
 * @packageDocumentation
 * @module modules/widget/color-picker
 */
import type { IJodit } from "../../../types";

/**
 * Build color picker
 *
 * @param callback - Callback 'function (color) \{\}'
 * @param coldColor - Color value ex. #fff or rgb(123, 123, 123) or rgba(123, 123, 123, 1)
 * @example
 * ```javascript
 * const tabs = TabsWidget(editor, {
 *    'Text': ColorPickerWidget(editor, function (color) {
 *         box.style.color = color;
 *     }, box.style.color),
 *     'Background': ColorPickerWidget(editor, function (color) {
 *         box.style.backgroundColor = color;
 *     }, box.style.backgroundColor),
 * });
 * ```
 */
export declare const ColorPickerWidget: (editor: IJodit, callback: (newColor: string) => void, coldColor: string) => HTMLDivElement;
