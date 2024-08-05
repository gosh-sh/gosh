/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:modules/widget/file-selector/README.md]]
 * @packageDocumentation
 * @module modules/widget/file-selector
 */
import type { IFileBrowserCallBackData, IJodit } from "../../../types";
interface ImageSelectorCallbacks {
    /**
     * Function that will be called when the user enters the URL of the tab image and alternative text for images
     */
    url?: (this: IJodit, url: string, alt: string) => void;
    /**
     * Function that will be called when the user clicks on the file browser tab,
     * and then choose any image in the window that opens
     */
    filebrowser?: (data: IFileBrowserCallBackData) => void;
    /**
     * Function that will be called when the user selects a file or using drag and drop files to the `Upload` tab
     */
    upload?: ((this: IJodit, data: IFileBrowserCallBackData) => void) | true;
}
/**
 * Generate 3 tabs
 * upload - Use Drag and Drop
 * url - By specifying the image url
 * filebrowser - After opening the file browser. In the absence of one of the parameters will be less tabs
 *
 * @param callbacks - Object with keys `url`, `upload` and `filebrowser`, values which are callback
 * functions with different parameters
 */
export declare const FileSelectorWidget: (editor: IJodit, callbacks: ImageSelectorCallbacks, elm: HTMLElement | null, close: () => void, isImage?: boolean) => HTMLDivElement;
export {};
