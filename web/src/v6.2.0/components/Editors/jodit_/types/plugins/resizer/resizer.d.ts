/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/resizer/README.md]]
 * @packageDocumentation
 * @module plugins/resizer
 */
import type { IJodit } from "../../types";
import { Plugin } from "../../core/plugin/plugin";
import "./config";

/**
 * The module creates a supporting frame for resizing of the elements img and table
 */
export declare class resizer extends Plugin {
    private LOCK_KEY;
    private handle;
    private element;
    private isResizeMode;
    private isShown;
    private startX;
    private startY;
    private width;
    private height;
    private ratio;
    private rect;
    private sizeViewer;
    /** @override */
    protected afterInit(editor: IJodit): void;
    /**
     * Click in the editor area
     */
    protected onEditorClick(e: MouseEvent): void;
    private addEventListeners;
    private onStartResizing;
    private onEndResizing;
    private pointerX;
    private pointerY;
    private onResize;
    private isAltMode;
    private onKeyDown;
    private onKeyUp;
    private onClickOutside;
    private getWorkplacePosition;
    private applySize;
    private onDelete;
    private __onChangeEditor;
    /**
     * Bind an edit element to element
     * @param element - The element that you want to add a function to resize
     */
    private __bind;
    private onClickElement;
    private updateSize;
    private showSizeViewer;
    /**
     * Show resizer
     */
    private show;
    /**
     * Hide resizer
     */
    private hide;
    private hideSizeViewer;
    protected beforeDestruct(jodit: IJodit): void;
}
