/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:modules/widget/tabs/README.md]]
 * @packageDocumentation
 * @module modules/widget/tabs
 */
import type { IViewBased } from "../../../types";
import { UIElement } from "../../../core/ui";

export interface TabOption {
    icon?: string;
    name: string;
    content: HTMLElement | ((this: IViewBased) => void) | UIElement;
}
/**
 * Build tabs system
 *
 * @param tabs - PlainObject where 'key' will be tab's Title and `value` is tab's content
 * @param state - You can use for this param any HTML element for remembering active tab
 *
 * @example
 * ```javascript
 * const editor = Jodit.make('#editor');
 * const tabs = Jodit.modules.TabsWidget(editor, [
 *  { name: 'Images', content: '<div>Images</div>' },
 *  {
 *    name: 'Title 2',
 *    content: editor.c.fromHTML('<div>Some content</div>')
 *  },
 *  {
 *    name: 'Color Picker',
 *    content: ColorPickerWidget(
 *      editor,
 *      function (color) {
 *        box.style.color = color;
 *      },
 *      box.style.color
 *    )
 *  }
 * ]);
 * ```
 */
export declare const TabsWidget: (jodit: IViewBased, tabs: TabOption[], state?: {
    activeTab: string;
}) => HTMLDivElement;
