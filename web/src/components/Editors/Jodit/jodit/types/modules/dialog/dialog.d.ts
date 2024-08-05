/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module modules/dialog
 */
import type { Content, IDialog, IDialogOptions, IToolbarCollection } from "../../types";
import { ViewWithToolbar } from "../../core/view/view-with-toolbar";

declare module 'jodit/config' {
    interface Config {
        dialog: IDialogOptions;
    }
}
/**
 * Module to generate dialog windows
 */
export declare class Dialog extends ViewWithToolbar implements IDialog {
    /** @override */
    className(): string;
    private readonly resizer;
    toolbar: IToolbarCollection;
    private offsetX?;
    private offsetY?;
    private get destination();
    private destroyAfterClose;
    private moved;
    private resizable;
    private draggable;
    private startX;
    private startY;
    private startPoint;
    private lockSelect;
    private unlockSelect;
    private setElements;
    private onMouseUp;
    /**
     *
     */
    private onHeaderMouseDown;
    private onMouseMove;
    private onEsc;
    private onResize;
    private onResizerMouseDown;
    private addGlobalResizeListeners;
    private removeGlobalResizeListeners;
    OPTIONS: IDialogOptions;
    readonly dialog: HTMLElement;
    workplace: HTMLDivElement;
    private readonly dialogbox_header;
    private readonly dialogbox_content;
    private readonly dialogbox_footer;
    private readonly dialogbox_toolbar;
    /**
     * Specifies the size of the window
     *
     * @param w - The width of the window
     * @param h - The height of the window
     */
    setSize(w?: number | string, h?: number | string): this;
    /**
     * Recalculate auto sizes
     */
    calcAutoSize(): this;
    /**
     * Specifies the position of the upper left corner of the window . If x and y are specified,
     * the window is centered on the center of the screen
     *
     * @param x - Position px Horizontal
     * @param y - Position px Vertical
     */
    setPosition(x?: number, y?: number): this;
    /**
     * Specifies the dialog box title . It can take a string and an array of objects
     *
     * @param content - A string or an HTML element ,
     * or an array of strings and elements
     * @example
     * ```javascript
     * var dialog = new Jodi.modules.Dialog(parent);
     * dialog.setHeader('Hello world');
     * dialog.setHeader(['Hello world', '<button>OK</button>', $('<div>some</div>')]);
     * dialog.open();
     * ```
     */
    setHeader(content: Content): this;
    /**
     * It specifies the contents of the dialog box. It can take a string and an array of objects
     *
     * @param content - A string or an HTML element ,
     * or an array of strings and elements
     * @example
     * ```javascript
     * var dialog = new Jodi.modules.Dialog(parent);
     * dialog.setHeader('Hello world');
     * dialog.setContent('<form onsubmit="alert(1);"><input type="text" /></form>');
     * dialog.open();
     * ```
     */
    setContent(content: Content): this;
    /**
     * Sets the bottom of the dialog. It can take a string and an array of objects
     *
     * @param content - A string or an HTML element ,
     * or an array of strings and elements
     * @example
     * ```javascript
     * var dialog = new Jodi.modules.Dialog(parent);
     * dialog.setHeader('Hello world');
     * dialog.setContent('<form><input id="someText" type="text" /></form>');
     * dialog.setFooter([
     *  $('<a class="jodit-button">OK</a>').click(function () {
     *      alert($('someText').val())
     *      dialog.close();
     *  })
     * ]);
     * dialog.open();
     * ```
     */
    setFooter(content: Content): this;
    /**
     * Get zIndex from dialog
     */
    getZIndex(): number;
    /**
     * Get dialog instance with maximum z-index displaying it on top of all the dialog boxes
     */
    getMaxZIndexDialog(): IDialog;
    /**
     * Sets the maximum z-index dialog box, displaying it on top of all the dialog boxes
     */
    setMaxZIndex(): void;
    /**
     * Expands the dialog on full browser window
     */
    toggleFullSize(isFullSize?: boolean): void;
    open(destroyAfterClose: boolean): this;
    open(destroyAfterClose: boolean, modal: boolean): this;
    open(content?: Content, title?: Content, destroyAfterClose?: boolean, modal?: boolean): this;
    private isModal;
    /**
     * Set modal mode
     */
    setModal(modal: undefined | boolean): this;
    /**
     * True, if dialog was opened
     */
    isOpened: boolean;
    /****
     * Closes the dialog box , if you want to call the method `destruct`
     *
     * @see destroy
     * @example
     * ```javascript
     * //You can close dialog two ways
     * var dialog = new Jodit.modules.Dialog();
     * dialog.open('Hello world!', 'Title');
     * var $close = dialog.create.fromHTML('<a href="#" style="float:left;" class="jodit-button">
     *     <i class="icon icon-check"></i>&nbsp;' + Jodit.prototype.i18n('Ok') + '</a>');
     * $close.addEventListener('click', function () {
     *     dialog.close();
     * });
     * dialog.setFooter($close);
     * // and second way, you can close dialog from content
     * dialog.open('<a onclick="var event = doc.createEvent('HTMLEvents'); event.initEvent('close_dialog', true, true);
     * this.dispatchEvent(event)">Close</a>', 'Title');
     * ```
     */
    close(): this;
    constructor(options?: Partial<IDialogOptions>);
    /**
     * Build toolbar after ready
     */
    protected buildToolbar(): void;
    /**
     * It destroys all objects created for the windows and also includes all the handlers for the window object
     */
    destruct(): void;
    static defaultOptions: IDialogOptions;
}
