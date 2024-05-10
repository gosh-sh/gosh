/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module modules/file-browser
 */
import type { CanUndef, IFileBrowser, IFileBrowserCallBackData, IFileBrowserDataProvider, IFileBrowserOptions, IFileBrowserState, IStorage, IUploader } from "../../types";
import { Dlgs } from "../../core/traits/dlgs";
import { ViewWithToolbar } from "../../core/view/view-with-toolbar";
import "./config";
import { FileBrowserFiles, FileBrowserTree } from "./ui";

export interface FileBrowser extends Dlgs {
}
export declare class FileBrowser extends ViewWithToolbar implements IFileBrowser, Dlgs {
    /** @override */
    className(): string;
    private browser;
    private status_line;
    tree: FileBrowserTree;
    files: FileBrowserFiles;
    state: IFileBrowserState & import("../../types").IObservable;
    get dataProvider(): IFileBrowserDataProvider;
    private onSelect;
    private errorHandler;
    OPTIONS: IFileBrowserOptions;
    private get _dialog();
    /**
     * Container for set/get value
     */
    get storage(): IStorage;
    uploader: IUploader;
    get isOpened(): boolean;
    /**
     * It displays a message in the status bar of filebrowser
     *
     * @param message - The message that will be displayed
     * @param success - true It will be shown a message light . If no option is specified ,
     * ßan error will be shown the red
     * @example
     * ```javascript
     * parent.filebrowser.status('There was an error uploading file', false);
     * ```
     */
    status(message: string | Error, success?: boolean): void;
    /**
     * Close dialog
     */
    close: () => void;
    /**
     * It opens a web browser window
     *
     * @param callback - The function that will be called after the file selection in the browser
     * @param onlyImages - Show only images
     * @example
     * ```javascript
     * var fb = new Jodit.modules.FileBrowser(parent);
     * fb.open(function (data) {
     *     var i;
     *     for (i = 0;i < data.files.length; i += 1) {
     *         parent.s.insertImage(data.baseurl + data.files[i]);
     *     }
     * });
     * ```
     */
    open(callback?: CanUndef<(_: IFileBrowserCallBackData) => void>, onlyImages?: boolean): Promise<void>;
    private __prevButtons;
    private __getButtons;
    private initUploader;
    constructor(options?: IFileBrowserOptions);
    destruct(): void;
    private __updateToolbarButtons;
}
