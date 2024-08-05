/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { isArray } from "../../core/helpers/checker/is-array.js";
import { isJoditObject } from "../../core/helpers/checker/is-jodit-object.js";
import { Config } from "../../config.js";
/**
 * Module for processing download documents and images by Drag and Drop
 * Drag and Drop files
 */
Config.prototype.enableDragAndDropFileToEditor = true;
Config.prototype.uploader = {
    url: '',
    insertImageAsBase64URI: false,
    imagesExtensions: ['jpg', 'png', 'jpeg', 'gif'],
    headers: null,
    data: null,
    filesVariableName(i) {
        return `files[${i}]`;
    },
    withCredentials: false,
    pathVariableName: 'path',
    format: 'json',
    method: 'POST',
    prepareData(formData) {
        return formData;
    },
    isSuccess(resp) {
        return resp.success;
    },
    getMessage(resp) {
        return resp.data.messages !== undefined && isArray(resp.data.messages)
            ? resp.data.messages.join(' ')
            : '';
    },
    /**
     * @see [[IUploader.processFileName]]
     */
    processFileName(key, file, name) {
        return [key, file, name];
    },
    process(resp) {
        return resp.data;
    },
    error(e) {
        this.j.message.error(e.message, 4000);
    },
    getDisplayName(baseurl, filename) {
        return baseurl + filename;
    },
    defaultHandlerSuccess(resp) {
        const j = this.j || this;
        if (!isJoditObject(j)) {
            return;
        }
        if (resp.files && resp.files.length) {
            resp.files.forEach((filename, index) => {
                const [tagName, attr] = resp.isImages && resp.isImages[index]
                    ? ['img', 'src']
                    : ['a', 'href'];
                const elm = j.createInside.element(tagName);
                elm.setAttribute(attr, resp.baseurl + filename);
                if (tagName === 'a') {
                    elm.textContent = j.o.uploader.getDisplayName.call(this, resp.baseurl, filename);
                }
                if (tagName === 'img') {
                    j.s.insertImage(elm, null, j.o.imageDefaultWidth);
                }
                else {
                    j.s.insertNode(elm);
                }
            });
        }
    },
    defaultHandlerError(e) {
        this.j.message.error(e.message);
    },
    contentType(requestData) {
        return this.ow.FormData !== undefined &&
            typeof requestData !== 'string'
            ? false
            : 'application/x-www-form-urlencoded; charset=UTF-8';
    }
};
