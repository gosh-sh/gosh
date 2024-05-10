/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/inline-popup/README.md]]
 * @packageDocumentation
 * @module plugins/inline-popup
 */
import type { IJodit } from "../../types";
import { Plugin } from "../../core/plugin";
import "./config/config";

/**
 * Plugin for show inline popup dialog
 */
export declare class inlinePopup extends Plugin {
    static requires: string[];
    private type;
    private get popup();
    private get toolbar();
    private onClick;
    /**
     * Show inline popup with some toolbar
     *
     * @param type - selection, img, a etc.
     */
    private showPopup;
    private previousTarget?;
    /**
     * Hide opened popup
     */
    private hidePopup;
    protected onOutsideClick(): void;
    /**
     * Can show popup for this type
     */
    private canShowPopupForType;
    /**
     * For some elements do not show popup
     */
    private isExcludedTarget;
    /** @override **/
    protected afterInit(jodit: IJodit): void;
    private snapRange;
    private onSelectionStart;
    private onSelectionEnd;
    /**
     * Selection change handler
     */
    private onSelectionChange;
    /**
     * In not collapsed selection - only one image
     */
    private isSelectedTarget;
    /**
     * Shortcut for Table module
     */
    private get tableModule();
    /** @override **/
    protected beforeDestruct(jodit: IJodit): void;
    private elmsList;
    private _eventsList;
    private addListenersForElements;
    private removeListenersForElements;
    /**
     * Show the inline WYSIWYG toolbar editor.
     */
    private showInlineToolbar;
}
