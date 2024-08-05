/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:modules/context-menu/README.md]]
 * @packageDocumentation
 * @module modules/context-menu
 */
import type { IContextMenu, IContextMenuAction } from "../../types";
import { Popup } from "../../core/ui/popup/popup";

/**
 * Module to generate context menu
 */
export declare class ContextMenu extends Popup implements IContextMenu {
    /** @override */
    className(): string;
    /**
     * Generate and show context menu
     *
     * @param x - Global coordinate by X
     * @param y - Global coordinate by Y
     * @param actions - Array with plain objects `{icon: 'bin', title: 'Delete', exec: function () {}}`
     * @example
     * ```javascript
     * parent.show(e.clientX, e.clientY, [{icon: 'bin', title: 'Delete', exec: function () { alert(1) }}]);
     * ```
     */
    show(x: number, y: number, actions: Array<false | IContextMenuAction>): void;
}
