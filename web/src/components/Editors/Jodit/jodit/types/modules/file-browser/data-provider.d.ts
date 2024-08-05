/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module modules/file-browser
 */
import type { IFileBrowserAnswer, IFileBrowserDataProvider, IFileBrowserDataProviderItemsMods, IFileBrowserItem, IFileBrowserOptions, ImageBox, IPermissions, ISourcesFiles, IViewBased, Nullable } from "../../types";
export declare const DEFAULT_SOURCE_NAME = "default";
export default class DataProvider implements IFileBrowserDataProvider {
    readonly parent: IViewBased;
    readonly options: IFileBrowserOptions;
    private __currentPermissions;
    constructor(parent: IViewBased, options: IFileBrowserOptions);
    /**
     * Alias for options
     */
    get o(): this['options'];
    private __ajaxInstances;
    protected get<T extends IFileBrowserAnswer = IFileBrowserAnswer>(name: keyof IFileBrowserOptions): Promise<T>;
    private progressHandler;
    onProgress(callback: (percentage: number) => void): void;
    /**
     * Load permissions for path and source
     */
    permissions(path: string, source: string): Promise<Nullable<IPermissions>>;
    canI(action: string): boolean;
    private __items;
    /**
     * Load items list by path and source
     */
    items(path: string, source: string, mods?: IFileBrowserDataProviderItemsMods): Promise<IFileBrowserItem[]>;
    /**
     * Load items list by path and source
     */
    itemsEx(path: string, source: string, mods?: IFileBrowserDataProviderItemsMods): ReturnType<IFileBrowserDataProvider['itemsEx']>;
    private generateItemsList;
    tree(path: string, source: string): Promise<ISourcesFiles>;
    /**
     * Get path by url. You can use this method in another modules
     */
    getPathByUrl(url: string): Promise<any>;
    /**
     * Create a directory on the server
     *
     * @param name - Name the new folder
     * @param path - Relative directory in which you want create a folder
     * @param source - Server source key
     */
    createFolder(name: string, path: string, source: string): Promise<boolean>;
    /**
     * Move a file / directory on the server
     *
     * @param filepath - The relative path to the file / folder source
     * @param path - Relative to the directory where you want to move the file / folder
     */
    move(filepath: string, path: string, source: string, isFile: boolean): Promise<boolean>;
    /**
     * Deleting item
     *
     * @param path - Relative path
     * @param file - The filename
     * @param source - Source
     */
    private remove;
    /**
     * Deleting a file
     *
     * @param path - Relative path
     * @param file - The filename
     * @param source - Source
     */
    fileRemove(path: string, file: string, source: string): Promise<string>;
    /**
     * Deleting a folder
     *
     * @param path - Relative path
     * @param file - The filename
     * @param source - Source
     */
    folderRemove(path: string, file: string, source: string): Promise<string>;
    /**
     * Rename action
     *
     * @param path - Relative path
     * @param name - Old name
     * @param newname - New name
     * @param source - Source
     */
    private rename;
    /**
     * Rename folder
     */
    folderRename(path: string, name: string, newname: string, source: string): Promise<string>;
    /**
     * Rename file
     */
    fileRename(path: string, name: string, newname: string, source: string): Promise<string>;
    private changeImage;
    /**
     * Send command to server to crop image
     */
    crop(path: string, source: string, name: string, newname: string | void, box: ImageBox | void): Promise<boolean>;
    /**
     * Send command to server to resize image
     */
    resize(path: string, source: string, name: string, newname: string | void, box: ImageBox | void): Promise<boolean>;
    getMessage(resp: IFileBrowserAnswer): string;
    isSuccess(resp: IFileBrowserAnswer): boolean;
    destruct(): any;
}
