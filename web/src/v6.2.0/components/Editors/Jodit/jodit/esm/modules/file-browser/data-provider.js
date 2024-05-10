/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
        r = Reflect.decorate(decorators, target, key, desc);
    else
        for (var i = decorators.length - 1; i >= 0; i--)
            if (d = decorators[i])
                r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { IS_PROD } from "../../core/constants.js";
import { autobind } from "../../core/decorators/index.js";
import { abort, ConfigProto, error, isFunction, normalizeRelativePath, set } from "../../core/helpers/index.js";
import { Ajax } from "../../core/request/index.js";
import { FileBrowserItem } from "./builders/item.js";
export const DEFAULT_SOURCE_NAME = 'default';
const possibleRules = new Set([
    'allowFiles',
    'allowFileMove',
    'allowFileUpload',
    'allowFileUploadRemote',
    'allowFileRemove',
    'allowFileRename',
    'allowFolders',
    'allowFolderMove',
    'allowFolderCreate',
    'allowFolderRemove',
    'allowFolderRename',
    'allowImageResize',
    'allowImageCrop'
]);
let DataProvider = class DataProvider {
    constructor(parent, options) {
        this.parent = parent;
        this.options = options;
        this.__currentPermissions = null;
        this.__ajaxInstances = new Map();
        this.progressHandler = (ignore) => { };
    }
    /**
     * Alias for options
     */
    get o() {
        return this.options;
    }
    get(name) {
        const instances = this.__ajaxInstances;
        if (instances.has(name)) {
            const ajax = instances.get(name);
            ajax?.abort();
            instances.delete(name);
        }
        const opts = ConfigProto(this.options[name] !== undefined
            ? this.options[name]
            : {}, ConfigProto({
            onProgress: this.progressHandler
        }, this.o.ajax));
        if (opts.prepareData) {
            opts.data = opts.prepareData.call(this, opts.data);
        }
        const ajax = new Ajax(opts);
        instances.set(name, ajax);
        const promise = ajax.send();
        promise
            .finally(() => {
            ajax.destruct();
            instances.delete(name);
            this.progressHandler(100);
        })
            .catch(() => null);
        return promise
            .then(resp => resp.json())
            .then(resp => {
            if (resp && !this.isSuccess(resp)) {
                throw new Error(this.getMessage(resp));
            }
            return resp;
        });
    }
    onProgress(callback) {
        this.progressHandler = callback;
    }
    /**
     * Load permissions for path and source
     */
    async permissions(path, source) {
        if (!this.o.permissions) {
            return null;
        }
        this.o.permissions.data.path = path;
        this.o.permissions.data.source = source;
        if (this.o.permissions.url) {
            return this.get('permissions').then(resp => {
                if (this.parent.isInDestruct) {
                    throw abort();
                }
                let process = this.o.permissions.process;
                if (!process) {
                    process = this.o.ajax.process;
                }
                if (process) {
                    const respData = process.call(self, resp);
                    if (respData.data.permissions) {
                        this.parent.events.fire(this, 'changePermissions', this.__currentPermissions, respData.data.permissions);
                        this.__currentPermissions = respData.data.permissions;
                    }
                }
                return this.__currentPermissions;
            });
        }
        return null;
    }
    canI(action) {
        const rule = 'allow' + action;
        if (!IS_PROD) {
            if (!possibleRules.has(rule)) {
                throw error('Wrong action ' + action);
            }
        }
        const presetValue = this.o.permissionsPresets[rule];
        if (presetValue !== undefined) {
            return presetValue;
        }
        return (this.__currentPermissions == null ||
            this.__currentPermissions[rule] === undefined ||
            this.__currentPermissions[rule]);
    }
    __items(path, source, mods, onResult) {
        const opt = this.options;
        if (!opt.items) {
            return Promise.reject(Error('Set Items api options'));
        }
        opt.items.data.path = path;
        opt.items.data.source = source;
        opt.items.data.mods = mods;
        return this.get('items').then(resp => {
            let process = this.o.items.process;
            if (!process) {
                process = this.o.ajax.process;
            }
            if (process) {
                resp = process.call(self, resp);
            }
            return onResult(resp);
        });
    }
    /**
     * Load items list by path and source
     */
    items(path, source, mods = {}) {
        return this.__items(path, source, mods, resp => this.generateItemsList(resp.data.sources, mods));
    }
    /**
     * Load items list by path and source
     */
    itemsEx(path, source, mods = {}) {
        const calcTotal = (sources) => sources.reduce((acc, source) => acc + source.files.length, 0);
        return this.__items(path, source, mods, resp => ({
            items: this.generateItemsList(resp.data.sources, mods),
            loadedTotal: calcTotal(resp.data.sources)
        }));
    }
    generateItemsList(sources, mods = {}) {
        const elements = [];
        const canBeFile = (item) => item.type === 'folder' ||
            !mods.onlyImages ||
            item.isImage === undefined ||
            item.isImage;
        const inFilter = (item) => !mods.filterWord?.length ||
            this.o.filter === undefined ||
            this.o.filter(item, mods.filterWord);
        sources.forEach(source => {
            if (source.files && source.files.length) {
                const { sort } = this.o;
                if (isFunction(sort) && mods.sortBy) {
                    source.files.sort((a, b) => sort(a, b, mods.sortBy));
                }
                source.files.forEach((item) => {
                    if (inFilter(item) && canBeFile(item)) {
                        elements.push(FileBrowserItem.create({
                            ...item,
                            sourceName: source.name,
                            source
                        }));
                    }
                });
            }
        });
        return elements;
    }
    async tree(path, source) {
        path = normalizeRelativePath(path);
        if (!this.o.folder) {
            return Promise.reject(Error('Set Folder Api options'));
        }
        await this.permissions(path, source);
        this.o.folder.data.path = path;
        this.o.folder.data.source = source;
        return this.get('folder').then(resp => {
            let process = this.o.folder.process;
            if (!process) {
                process = this.o.ajax.process;
            }
            if (process) {
                resp = process.call(self, resp);
            }
            return resp.data.sources;
        });
    }
    /**
     * Get path by url. You can use this method in another modules
     */
    getPathByUrl(url) {
        set('options.getLocalFileByUrl.data.url', url, this);
        return this.get('getLocalFileByUrl').then(resp => {
            if (this.isSuccess(resp)) {
                return resp.data;
            }
            throw error(this.getMessage(resp));
        });
    }
    /**
     * Create a directory on the server
     *
     * @param name - Name the new folder
     * @param path - Relative directory in which you want create a folder
     * @param source - Server source key
     */
    createFolder(name, path, source) {
        const { create } = this.o;
        if (!create) {
            throw error('Set Create api options');
        }
        create.data.source = source;
        create.data.path = path;
        create.data.name = name;
        return this.get('create').then(resp => {
            if (this.isSuccess(resp)) {
                return true;
            }
            throw error(this.getMessage(resp));
        });
    }
    /**
     * Move a file / directory on the server
     *
     * @param filepath - The relative path to the file / folder source
     * @param path - Relative to the directory where you want to move the file / folder
     */
    move(filepath, path, source, isFile) {
        const mode = isFile
            ? 'fileMove'
            : 'folderMove';
        const option = this.options[mode];
        if (!option) {
            throw error('Set Move api options');
        }
        option.data.from = filepath;
        option.data.path = path;
        option.data.source = source;
        return this.get(mode).then(resp => {
            if (this.isSuccess(resp)) {
                return true;
            }
            throw error(this.getMessage(resp));
        });
    }
    /**
     * Deleting item
     *
     * @param path - Relative path
     * @param file - The filename
     * @param source - Source
     */
    remove(action, path, file, source) {
        const fr = this.o[action];
        if (!fr) {
            throw error(`Set "${action}" api options`);
        }
        fr.data.path = path;
        fr.data.name = file;
        fr.data.source = source;
        return this.get(action).then(resp => {
            if (fr.process) {
                resp = fr.process.call(this, resp);
            }
            return this.getMessage(resp);
        });
    }
    /**
     * Deleting a file
     *
     * @param path - Relative path
     * @param file - The filename
     * @param source - Source
     */
    fileRemove(path, file, source) {
        return this.remove('fileRemove', path, file, source);
    }
    /**
     * Deleting a folder
     *
     * @param path - Relative path
     * @param file - The filename
     * @param source - Source
     */
    folderRemove(path, file, source) {
        return this.remove('folderRemove', path, file, source);
    }
    /**
     * Rename action
     *
     * @param path - Relative path
     * @param name - Old name
     * @param newname - New name
     * @param source - Source
     */
    rename(action, path, name, newname, source) {
        const fr = this.o[action];
        if (!fr) {
            throw error(`Set "${action}" api options`);
        }
        fr.data.path = path;
        fr.data.name = name;
        fr.data.newname = newname;
        fr.data.source = source;
        return this.get(action).then(resp => {
            if (fr.process) {
                resp = fr.process.call(self, resp);
            }
            return this.getMessage(resp);
        });
    }
    /**
     * Rename folder
     */
    folderRename(path, name, newname, source) {
        return this.rename('folderRename', path, name, newname, source);
    }
    /**
     * Rename file
     */
    fileRename(path, name, newname, source) {
        return this.rename('fileRename', path, name, newname, source);
    }
    changeImage(type, path, source, name, newname, box) {
        if (!this.o[type]) {
            this.o[type] = {
                data: {}
            };
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const query = this.o[type];
        if (query.data === undefined) {
            query.data = {
                action: type
            };
        }
        query.data.newname = newname || name;
        if (box) {
            query.data.box = box;
        }
        query.data.path = path;
        query.data.name = name;
        query.data.source = source;
        return this.get(type).then(() => {
            return true;
        });
    }
    /**
     * Send command to server to crop image
     */
    crop(path, source, name, newname, box) {
        return this.changeImage('crop', path, source, name, newname, box);
    }
    /**
     * Send command to server to resize image
     */
    resize(path, source, name, newname, box) {
        return this.changeImage('resize', path, source, name, newname, box);
    }
    getMessage(resp) {
        return this.options.getMessage(resp);
    }
    isSuccess(resp) {
        return this.options.isSuccess(resp);
    }
    destruct() {
        this.__ajaxInstances.forEach(a => a.destruct());
        this.__ajaxInstances.clear();
    }
};
DataProvider = __decorate([
    autobind
], DataProvider);
export default DataProvider;
