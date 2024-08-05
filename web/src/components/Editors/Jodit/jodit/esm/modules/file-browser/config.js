/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import "../../core/request/config.js";
import { isArray, isString } from "../../core/helpers/checker/index.js";
import { humanSizeToBytes } from "../../core/helpers/utils/human-size-to-bytes.js";
import { UIFileInput } from "../../core/ui/form/inputs/file/file.js";
import { Config } from "../../config.js";
Config.prototype.filebrowser = {
    namespace: '',
    cache: true,
    extraButtons: [],
    filter(item, search) {
        search = search.toLowerCase();
        if (isString(item)) {
            return item.toLowerCase().indexOf(search) !== -1;
        }
        if (isString(item.name)) {
            return item.name.toLowerCase().indexOf(search) !== -1;
        }
        if (isString(item.file)) {
            return item.file.toLowerCase().indexOf(search) !== -1;
        }
        return true;
    },
    sortBy: 'changed-desc',
    sort(a, b, sortBy) {
        const [sortAttr, arrow] = sortBy.toLowerCase().split('-'), asc = arrow === 'asc';
        const compareStr = (f, s) => {
            if (f < s) {
                return asc ? -1 : 1;
            }
            if (f > s) {
                return asc ? 1 : -1;
            }
            return 0;
        };
        if (isString(a)) {
            return compareStr(a.toLowerCase(), b.toLowerCase());
        }
        if (a[sortAttr] === undefined || sortAttr === 'name') {
            if (isString(a.name)) {
                return compareStr(a.name.toLowerCase(), b.name.toLowerCase());
            }
            if (isString(a.file)) {
                return compareStr(a.file.toLowerCase(), b.file.toLowerCase());
            }
            return 0;
        }
        switch (sortAttr) {
            case 'changed': {
                const f = new Date(a.changed).getTime(), s = new Date(b.changed).getTime();
                return asc ? f - s : s - f;
            }
            case 'size': {
                const f = humanSizeToBytes(a.size), s = humanSizeToBytes(b.size);
                return asc ? f - s : s - f;
            }
        }
        return 0;
    },
    editImage: true,
    preview: true,
    showPreviewNavigation: true,
    showSelectButtonInPreview: true,
    contextMenu: true,
    howLongShowMsg: 3000,
    createNewFolder: true,
    deleteFolder: true,
    renameFolder: true,
    moveFolder: true,
    moveFile: true,
    permissionsPresets: {
        allowFileDownload: undefined,
        allowFileMove: undefined,
        allowFileRemove: undefined,
        allowFileRename: undefined,
        allowFileUpload: undefined,
        allowFileUploadRemote: undefined,
        allowFiles: undefined,
        allowFolderCreate: undefined,
        allowFolderMove: undefined,
        allowFolderRemove: undefined,
        allowFolderRename: undefined,
        allowFolderTree: undefined,
        allowFolders: undefined,
        allowGeneratePdf: undefined,
        allowImageCrop: undefined,
        allowImageResize: undefined
    },
    showFoldersPanel: true,
    storeLastOpenedFolder: true,
    width: 859,
    height: 400,
    buttons: [
        'filebrowser.upload',
        'filebrowser.remove',
        'filebrowser.update',
        'filebrowser.select',
        'filebrowser.edit',
        '|',
        'filebrowser.tiles',
        'filebrowser.list',
        '|',
        'filebrowser.filter',
        '|',
        'filebrowser.sort'
    ],
    removeButtons: [],
    fullsize: false,
    showTooltip: true,
    view: null,
    isSuccess(resp) {
        return resp.success;
    },
    getMessage(resp) {
        return resp.data.messages !== undefined && isArray(resp.data.messages)
            ? resp.data.messages.join(' ')
            : '';
    },
    showFileName: true,
    showFileSize: true,
    showFileChangeTime: true,
    saveStateInStorage: {
        storeLastOpenedFolder: true,
        storeView: true,
        storeSortBy: true
    },
    pixelOffsetLoadNewChunk: 200,
    getThumbTemplate(item, source, source_name) {
        const opt = this.options, IC = this.files.getFullElName('item'), showName = opt.showFileName, showSize = opt.showFileSize && item.size, showTime = opt.showFileChangeTime && item.time;
        let name = '';
        if (item.file !== undefined) {
            name = item.file;
        }
        const info = `<div class="${IC}-info">${showName ? `<span class="${IC}-info-filename">${name}</span>` : ''}${showSize
            ? `<span class="${IC}-info-filesize">${item.size}</span>`
            : ''}${showTime
            ? `<span class="${IC}-info-filechanged">${showTime}</span>`
            : ''}</div>`;
        return `<a
			data-jodit-file-browser-item="true"
			data-is-file="${item.isImage ? 0 : 1}"
			draggable="true"
			class="${IC}"
			href="${item.fileURL}"
			data-source="${source_name}"
			data-path="${item.path}"
			data-name="${name}"
			title="${name}"
			data-url="${item.fileURL}">
				<img
					data-is-file="${item.isImage ? 0 : 1}"
					data-src="${item.fileURL}"
					src="${item.imageURL}"
					alt="${name}"
					loading="lazy"
				/>
				${showName || showSize || showTime ? info : ''}
			</a>`;
    },
    ajax: {
        ...Config.prototype.defaultAjaxOptions,
        url: '',
        data: {},
        cache: true,
        contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
        method: 'POST',
        processData: true,
        headers: {},
        prepareData(data) {
            return data;
        },
        process(resp) {
            return resp;
        }
    },
    create: {
        data: { action: 'folderCreate' }
    },
    getLocalFileByUrl: {
        data: { action: 'getLocalFileByUrl' }
    },
    resize: {
        data: { action: 'imageResize' }
    },
    crop: {
        data: { action: 'imageCrop' }
    },
    fileMove: {
        data: { action: 'fileMove' }
    },
    folderMove: {
        data: { action: 'folderMove' }
    },
    fileRename: {
        data: { action: 'fileRename' }
    },
    folderRename: {
        data: { action: 'folderRename' }
    },
    fileRemove: {
        data: { action: 'fileRemove' }
    },
    folderRemove: {
        data: { action: 'folderRemove' }
    },
    items: {
        data: { action: 'files' }
    },
    folder: {
        data: { action: 'folders' }
    },
    permissions: {
        data: { action: 'permissions' }
    }
};
Config.prototype.controls.filebrowser = {
    upload: {
        icon: 'plus',
        isInput: true,
        isDisabled: (browser) => !browser.dataProvider.canI('FileUpload'),
        getContent: (filebrowser) => {
            const btn = new UIFileInput(filebrowser, {
                onlyImages: filebrowser.state.onlyImages
            });
            filebrowser.e.fire('bindUploader.filebrowser', btn.container);
            return btn.container;
        }
    },
    remove: {
        icon: 'bin',
        isDisabled: (browser) => {
            return (!browser.state.activeElements.length ||
                !browser.dataProvider.canI('FileRemove'));
        },
        exec: (editor) => {
            editor.e.fire('fileRemove.filebrowser');
        }
    },
    update: {
        exec: (editor) => {
            editor.e.fire('update.filebrowser');
        }
    },
    select: {
        icon: 'check',
        isDisabled: (browser) => !browser.state.activeElements.length,
        exec: (editor) => {
            editor.e.fire('select.filebrowser');
        }
    },
    edit: {
        icon: 'pencil',
        isDisabled: (browser) => {
            const selected = browser.state.activeElements;
            return (selected.length !== 1 ||
                !selected[0].isImage ||
                !(browser.dataProvider.canI('ImageCrop') ||
                    browser.dataProvider.canI('ImageResize')));
        },
        exec: editor => {
            editor.e.fire('edit.filebrowser');
        }
    },
    tiles: {
        icon: 'th',
        isActive: (filebrowser) => filebrowser.state.view === 'tiles',
        exec: (filebrowser) => {
            filebrowser.e.fire('view.filebrowser', 'tiles');
        }
    },
    list: {
        icon: 'th-list',
        isActive: (filebrowser) => filebrowser.state.view === 'list',
        exec: (filebrowser) => {
            filebrowser.e.fire('view.filebrowser', 'list');
        }
    },
    filter: {
        isInput: true,
        getContent: (filebrowser, b) => {
            const oldInput = b.container.querySelector('.jodit-input');
            if (oldInput) {
                return oldInput;
            }
            const input = filebrowser.c.element('input', {
                class: 'jodit-input',
                placeholder: filebrowser.i18n('Filter')
            });
            input.value = filebrowser.state.filterWord;
            filebrowser.e.on(input, 'keydown mousedown', filebrowser.async.debounce(() => {
                filebrowser.e.fire('filter.filebrowser', input.value);
            }, filebrowser.defaultTimeout));
            return input;
        }
    },
    sort: {
        isInput: true,
        getContent: (fb) => {
            const select = fb.c.fromHTML('<select class="jodit-input jodit-select">' +
                `<option value="changed-asc">${fb.i18n('Sort by changed')} (⬆)</option>` +
                `<option value="changed-desc">${fb.i18n('Sort by changed')} (⬇)</option>` +
                `<option value="name-asc">${fb.i18n('Sort by name')} (⬆)</option>` +
                `<option value="name-desc">${fb.i18n('Sort by name')} (⬇)</option>` +
                `<option value="size-asc">${fb.i18n('Sort by size')} (⬆)</option>` +
                `<option value="size-desc">${fb.i18n('Sort by size')} (⬇)</option>` +
                '</select>');
            select.value = fb.state.sortBy;
            fb.e
                .on('sort.filebrowser', (value) => {
                if (select.value !== value) {
                    select.value = value;
                }
            })
                .on(select, 'change', () => {
                fb.e.fire('sort.filebrowser', select.value);
            });
            return select;
        }
    }
};
