/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:modules/image-editor/README.md]]
 * @packageDocumentation
 * @module modules/image-editor
 */
import type { IDialog, IDlgs, IFileBrowserDataProvider, ImageEditorActionBox, ImageEditorOptions, IViewWithToolbar } from "../../types";
import { ViewComponent } from "../../core/component";
import "./config";

interface onSave {
    (
    /**
     * new filename
     */
    newname: string | void, box: ImageEditorActionBox, 
    /**
     * called after success operation
     */
    success: () => void, 
    /**
     * called after failed operation
     */
    failed: (error: Error) => void): void;
}
/**
 * The module allows you to edit the image: resize or cut any part of it
 *
 */
export declare class ImageEditor extends ViewComponent<IViewWithToolbar & IDlgs> {
    /** @override */
    className(): string;
    options: ImageEditorOptions;
    get o(): this['options'];
    private onSave;
    /**
     * Hide image editor
     */
    hide(): void;
    /**
     * Open image editor
     * @example
     * ```javascript
     * const jodit = Jodit.make('.editor', {
     *		 imageeditor: {
     *				 crop: false,
     *				 closeAfterSave: true,
     *				 width: 500
     *		 }
     * });
     * jodit.imageeditor.open('https://xdsoft.net/jodit/images/test.png', function (name, data, success, failed) {
     *		 var img = jodit.node.c('img');
     *		 img.setAttribute('src', 'https://xdsoft.net/jodit/images/test.png');
     *		 if (box.action !== 'resize') {
     *					return failed('Sorry it is work only in resize mode. For croping use FileBrowser');
     *		 }
     *		 img.style.width = data.w;
     *		 img.style.height = data.h;
     *		 jodit.s.insertNode(img);
     *		 success();
     * });
     * ```
     */
    open(url: string, save: onSave): Promise<IDialog>;
    private resizeUseRatio;
    private cropUseRatio;
    private readonly _dialog;
    private image;
    private cropImage;
    private clicked;
    private target;
    private start_x;
    private start_y;
    private top_x;
    private top_y;
    private width;
    private height;
    private activeTab;
    private naturalWidth;
    private naturalHeight;
    private ratio;
    private new_h;
    private new_w;
    private diff_x;
    private diff_y;
    private readonly buttons;
    private readonly editor;
    private readonly resize_box;
    private readonly crop_box;
    private sizes;
    private readonly resizeHandler;
    private readonly cropHandler;
    private readonly cropBox;
    private readonly resizeBox;
    private static calcValueByPercent;
    private calcCropBox;
    private showCrop;
    private updateCropBox;
    private updateResizeBox;
    private setHandlers;
    private onTitleModeClick;
    private onChangeSizeInput;
    private onResizeHandleMouseDown;
    private onGlobalMouseUp;
    private onGlobalMouseMove;
    constructor(editor: IViewWithToolbar & IDlgs);
    /** @override */
    destruct(): any;
}
/**
 * Open Image Editor
 */
export declare function openImageEditor(this: IViewWithToolbar & {
    dataProvider: IFileBrowserDataProvider;
}, href: string, name: string, path: string, source: string, onSuccess?: () => void, onFailed?: (error: Error) => void): Promise<IDialog>;
export {};
