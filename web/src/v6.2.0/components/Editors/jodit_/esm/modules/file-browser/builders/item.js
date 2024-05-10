/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { normalizePath, normalizeUrl } from "../../../core/helpers/index.js";
export class FileBrowserItem {
    constructor(data) {
        this.data = data;
        // TODO Check with Object.assign
        Object.keys(data).forEach(key => {
            this[key] = data[key];
        });
    }
    static create(data) {
        if (data instanceof FileBrowserItem) {
            return data;
        }
        return new FileBrowserItem(data);
    }
    get path() {
        return normalizePath(this.data.source.path ? this.data.source.path + '/' : '/');
    }
    get imageURL() {
        const timestamp = this.time || new Date().getTime().toString(), { thumbIsAbsolute, source, thumb, file } = this.data, path = thumb || file;
        return thumbIsAbsolute && path
            ? path
            : normalizeUrl(source.baseurl, source.path, path || '') +
                '?_tmst=' +
                encodeURIComponent(timestamp);
    }
    get fileURL() {
        let { name } = this.data;
        const { file, fileIsAbsolute, source } = this.data;
        if (file !== undefined) {
            name = file;
        }
        return fileIsAbsolute && name
            ? name
            : normalizeUrl(source.baseurl, source.path, name || '');
    }
    get time() {
        const { changed } = this.data;
        return ((changed &&
            (typeof changed === 'number'
                ? new Date(changed).toLocaleString()
                : changed)) ||
            '');
    }
    get uniqueHashKey() {
        const data = this.data;
        let key = [
            data.sourceName,
            data.name,
            data.file,
            this.time,
            data.thumb
        ].join('_');
        key = key.toLowerCase().replace(/[^0-9a-z\-.]/g, '-');
        return key;
    }
    toJSON() {
        return this.data;
    }
}
