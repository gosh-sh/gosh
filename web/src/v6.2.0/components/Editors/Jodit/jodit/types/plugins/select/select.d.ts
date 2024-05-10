/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/select/README.md]]
 * @packageDocumentation
 * @module plugins/select
 */
import type { IJodit } from "../../types";
import { Plugin } from "../../core/plugin";
import "./config";
/**
 * A utility plugin that allows you to subscribe to a click/mousedown/touchstart/mouseup on an element in DOM order
 *
 * @example
 * ```js
 * const editor = Jodit.make('#editor');
 * editor.e.on('clickImg', (img) => {
 *   console.log(img.src);
 * })
 * ```
 */
export declare class select extends Plugin {
    private proxyEventsList;
    protected afterInit(jodit: IJodit): void;
    protected beforeDestruct(jodit: IJodit): void;
    private onStartSelection;
    /**
     * @event outsideClick(e) - when user clicked on the outside of editor
     */
    protected onOutsideClick(e: MouseEvent): void;
    protected beforeCommandCut(): void | false;
    protected beforeCommandSelectAll(): false;
    /**
     * Normalize selection after triple click
     */
    protected onTripleClickNormalizeSelection(e: MouseEvent): void;
    protected onCopyNormalizeSelectionBound(e?: ClipboardEvent): void;
}
