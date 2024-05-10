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
import { STATUSES } from "../../core/component/index.js";
import * as consts from "../../core/constants.js";
import { IS_PROD } from "../../core/constants.js";
import { autobind, cache, derive } from "../../core/decorators/index.js";
import { watch } from "../../core/decorators/watch/watch.js";
import { observable } from "../../core/event-emitter/index.js";
import { ConfigProto, error, isAbortError, isFunction, isString, trim } from "../../core/helpers/index.js";
import { Storage } from "../../core/storage/index.js";
import { Dlgs } from "../../core/traits/dlgs.js";
import { ViewWithToolbar } from "../../core/view/view-with-toolbar.js";
import "./config.js";
import { loadItems } from "./fetch/load-items.js";
import { loadTree } from "./fetch/load-tree.js";
import { nativeListeners } from "./listeners/native-listeners.js";
import { selfListeners } from "./listeners/self-listeners.js";
import { stateListeners } from "./listeners/state-listeners.js";
import { DEFAULT_SOURCE_NAME } from "./data-provider.js";
import { makeDataProvider } from "./factories.js";
import { FileBrowserFiles, FileBrowserTree } from "./ui/index.js";
import { Config } from "../../config.js";
let FileBrowser = class FileBrowser extends ViewWithToolbar {
    /** @override */
    className() {
        return 'FileBrowser';
    }
    get dataProvider() {
        return makeDataProvider(this, this.options);
    }
    // eslint-disable-next-line no-unused-vars
    onSelect(callback) {
        return () => {
            if (this.state.activeElements.length) {
                const files = [];
                const isImages = [];
                this.state.activeElements.forEach(elm => {
                    const url = elm.fileURL;
                    if (url) {
                        files.push(url);
                        isImages.push(elm.isImage || false);
                    }
                });
                this.close();
                const data = {
                    baseurl: '',
                    files,
                    isImages
                };
                if (isFunction(callback)) {
                    callback(data);
                }
                this.close();
            }
            return false;
        };
    }
    get _dialog() {
        const dialog = this.dlg({
            minWidth: Math.min(700, screen.width),
            minHeight: 300,
            buttons: this.o.headerButtons ?? ['fullsize', 'dialog.close']
        });
        ['beforeClose', 'afterClose', 'beforeOpen'].forEach(proxyEvent => dialog.events.on(dialog, proxyEvent, () => this.e.fire(proxyEvent)));
        dialog.setSize(this.o.width, this.o.height);
        return dialog;
    }
    /**
     * Container for set/get value
     */
    get storage() {
        return Storage.makeStorage(Boolean(this.o.saveStateInStorage), this.componentName);
    }
    get isOpened() {
        return this._dialog.isOpened && this.browser.style.display !== 'none';
    }
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
    status(message, success) {
        if (!message || isAbortError(message)) {
            return;
        }
        if (!isString(message)) {
            message = message.message;
        }
        if (!isString(message) || !trim(message).length) {
            return;
        }
        this.message.message(message, success ? 'success' : 'error', this.o.howLongShowMsg);
    }
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
    open(callback = this.o
        .defaultCallback, onlyImages = false) {
        this.state.onlyImages = onlyImages;
        return this.async
            .promise((resolve, reject) => {
            if (!this.o.items || !this.o.items.url) {
                throw error('Need set options.filebrowser.ajax.url');
            }
            let localTimeout = 0;
            this.e
                .off(this.files.container, 'dblclick')
                .on(this.files.container, 'dblclick', this.onSelect(callback))
                .on(this.files.container, 'touchstart', () => {
                const now = new Date().getTime();
                if (now - localTimeout <
                    consts.EMULATE_DBLCLICK_TIMEOUT) {
                    this.onSelect(callback)();
                }
                localTimeout = now;
            })
                .off('select.filebrowser')
                .on('select.filebrowser', this.onSelect(callback));
            const header = this.c.div();
            this.toolbar?.appendTo(header);
            this.__updateToolbarButtons();
            this._dialog.open(this.browser, header);
            this.e.fire('sort.filebrowser', this.state.sortBy);
            loadTree(this)
                .then(resolve, reject)
                .finally(() => {
                if (this.isInDestruct) {
                    return;
                }
                this?.e?.fire('fileBrowserReady.filebrowser');
            });
        })
            .catch((e) => {
            if (!isAbortError(e) && !IS_PROD) {
                throw e;
            }
        });
    }
    __getButtons() {
        const options = (this.o.buttons ?? []);
        return options.filter((btn) => {
            if (!isString(btn)) {
                return true;
            }
            switch (btn) {
                case 'filebrowser.upload':
                    return this.dataProvider.canI('FileUpload');
                case 'filebrowser.edit':
                    return (this.dataProvider.canI('ImageResize') ||
                        this.dataProvider.canI('ImageCrop'));
                case 'filebrowser.remove':
                    return this.dataProvider.canI('FileRemove');
            }
            return true;
        });
    }
    initUploader(editor) {
        const self = this, options = editor?.options?.uploader, uploaderOptions = ConfigProto(options || {}, Config.defaultOptions.uploader);
        const uploadHandler = () => loadItems(this);
        self.uploader = self.getInstance('Uploader', uploaderOptions);
        self.uploader
            .setPath(self.state.currentPath)
            .setSource(self.state.currentSource)
            .bind(self.browser, uploadHandler, self.errorHandler);
        this.state.on(['change.currentPath', 'change.currentSource'], () => {
            this.uploader
                .setPath(this.state.currentPath)
                .setSource(this.state.currentSource);
        });
        self.e.on('bindUploader.filebrowser', (button) => {
            self.uploader.bind(button, uploadHandler, self.errorHandler);
        });
    }
    constructor(options) {
        super(options);
        this.browser = this.c.div(this.componentName);
        this.status_line = this.c.div(this.getFullElName('status'));
        this.tree = new FileBrowserTree(this);
        this.files = new FileBrowserFiles(this);
        this.state = observable({
            currentPath: '',
            currentSource: DEFAULT_SOURCE_NAME,
            currentBaseUrl: '',
            activeElements: [],
            elements: [],
            sources: [],
            view: 'tiles',
            sortBy: 'changed-desc',
            filterWord: '',
            onlyImages: false
        });
        this.errorHandler = (resp) => {
            if (isAbortError(resp)) {
                return;
            }
            if (resp instanceof Error) {
                this.status(this.i18n(resp.message));
            }
            else {
                this.status(this.dataProvider.getMessage(resp));
            }
        };
        /**
         * Close dialog
         */
        this.close = () => {
            this._dialog.close();
        };
        this.__prevButtons = [];
        this.attachEvents(options);
        const self = this;
        self.options = ConfigProto(options || {}, Config.defaultOptions.filebrowser);
        self.browser.component = this;
        self.container = self.browser;
        if (self.o.showFoldersPanel) {
            self.browser.appendChild(self.tree.container);
        }
        self.browser.appendChild(self.files.container);
        self.browser.appendChild(self.status_line);
        selfListeners.call(self);
        nativeListeners.call(self);
        stateListeners.call(self);
        const keys = [
            'getLocalFileByUrl',
            'crop',
            'resize',
            'create',
            'fileMove',
            'folderMove',
            'fileRename',
            'folderRename',
            'fileRemove',
            'folderRemove',
            'folder',
            'items',
            'permissions'
        ];
        keys.forEach(key => {
            if (this.options[key] != null) {
                this.options[key] = ConfigProto(this.options[key], this.o.ajax);
            }
        });
        const { storeView, storeSortBy, storeLastOpenedFolder } = this.o
            .saveStateInStorage || {
            storeLastOpenedFolder: false,
            storeView: false,
            storeSortBy: false
        };
        const view = storeView && this.storage.get('view');
        if (view && this.o.view == null) {
            self.state.view = view === 'list' ? 'list' : 'tiles';
        }
        else {
            self.state.view = self.o.view === 'list' ? 'list' : 'tiles';
        }
        self.files.setMod('view', self.state.view);
        const sortBy = storeSortBy && self.storage.get('sortBy');
        if (sortBy) {
            const parts = sortBy.split('-');
            self.state.sortBy = ['changed', 'name', 'size'].includes(parts[0])
                ? sortBy
                : 'changed-desc';
        }
        else {
            self.state.sortBy = self.o.sortBy || 'changed-desc';
        }
        if (storeLastOpenedFolder) {
            const currentPath = self.storage.get('currentPath'), currentSource = self.storage.get('currentSource');
            self.state.currentPath = currentPath ?? '';
            self.state.currentSource = currentSource ?? '';
        }
        self.initUploader(self);
        self.setStatus(STATUSES.ready);
    }
    destruct() {
        if (this.isInDestruct) {
            return;
        }
        super.destruct();
        this._dialog.destruct();
        this.events && this.e.off('.filebrowser');
        this.uploader && this.uploader.destruct();
    }
    __updateToolbarButtons() {
        const buttons = this.__getButtons();
        if (isEqualButtonList(this.__prevButtons, buttons)) {
            return;
        }
        this.__prevButtons = buttons;
        this.toolbar?.build(buttons);
    }
};
__decorate([
    cache
], FileBrowser.prototype, "dataProvider", null);
__decorate([
    cache
], FileBrowser.prototype, "_dialog", null);
__decorate([
    cache
], FileBrowser.prototype, "storage", null);
__decorate([
    autobind
], FileBrowser.prototype, "status", null);
__decorate([
    autobind
], FileBrowser.prototype, "open", null);
__decorate([
    watch('dataProvider:changePermissions')
], FileBrowser.prototype, "__updateToolbarButtons", null);
FileBrowser = __decorate([
    derive(Dlgs)
], FileBrowser);
export { FileBrowser };
function isEqualButtonList(prevButtons, buttons) {
    if (prevButtons.length !== buttons.length) {
        return false;
    }
    for (let i = 0; i < prevButtons.length; i++) {
        if (prevButtons[i] !== buttons[i]) {
            return false;
        }
    }
    return true;
}
