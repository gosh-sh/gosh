/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { STATUSES, ViewComponent } from "../../core/component/index.js";
import { IS_ES_NEXT, IS_IE } from "../../core/constants.js";
import { ConfigProto, error, isFunction, isJoditObject } from "../../core/helpers/index.js";
import { ajaxInstances, hasFiles, hasItems, processOldBrowserDrag, send, sendFiles } from "./helpers/index.js";
import "./config.js";
import { Config } from "../../config.js";
export class Uploader extends ViewComponent {
    get j() {
        return this.jodit;
    }
    /** @override */
    className() {
        return 'Uploader';
    }
    get o() {
        return this.options;
    }
    /**
     * It sets the path for uploading files
     */
    setPath(path) {
        this.path = path;
        return this;
    }
    /**
     * It sets the source for connector
     */
    setSource(source) {
        this.source = source;
        return this;
    }
    /**
     * Set the handlers Drag and Drop to `$form`
     *
     * @param form - Form or any Node on which you can drag and drop the file. In addition will be processed
     * <code>&lt;input type="file" &gt;</code>
     * @param handlerSuccess - The function be called when a successful uploading files
     * to the server
     * @param handlerError - The function that will be called during a failed download files a server
     * @example
     * ```javascript
     * var $form = jQuery('<form><input type="text" typpe="file"></form>');
     * jQuery('body').append($form);
     * Jodit.editors.someidfoeditor.uploader.bind($form[0], function (files) {
     *     var i;
     *     for (i = 0; i < data.files.length; i += 1) {
     *         parent.s.insertImage(data.files[i])
     *     }
     * });
     * ```
     */
    bind(form, handlerSuccess, handlerError) {
        const onFinally = () => {
            form.classList.remove('jodit_drag_hover');
        };
        const self = this, onPaste = (e) => {
            let i, file, extension;
            const cData = e.clipboardData;
            const processData = (formdata) => {
                if (file) {
                    formdata.append('extension', extension);
                    formdata.append('mimetype', file.type);
                }
            };
            // send data on server
            if (!IS_IE && hasFiles(cData)) {
                sendFiles(self, cData.files, handlerSuccess, handlerError).finally(onFinally);
                return false;
            }
            if (IS_IE && !IS_ES_NEXT) {
                return processOldBrowserDrag(self, cData, handlerSuccess, handlerError, onFinally);
            }
            if (hasItems(cData)) {
                const { items } = cData;
                for (i = 0; i < items.length; i += 1) {
                    if (items[i].kind === 'file' &&
                        items[i].type === 'image/png') {
                        file = items[i].getAsFile();
                        if (file) {
                            const mime = file.type.match(/\/([a-z0-9]+)/i);
                            extension = mime[1]
                                ? mime[1].toLowerCase()
                                : '';
                            sendFiles(self, [file], handlerSuccess, handlerError, processData).finally(onFinally);
                        }
                        e.preventDefault();
                        break;
                    }
                }
            }
        };
        if (self.j && self.j.editor !== form) {
            self.j.e.on(form, 'paste', onPaste);
        }
        else {
            self.j.e.on('beforePaste', onPaste);
        }
        this.attachEvents(form, handlerSuccess, handlerError, onFinally);
    }
    attachEvents(form, handlerSuccess, handlerError, onFinally) {
        const self = this;
        self.j.e
            .on(form, 'dragend dragover dragenter dragleave drop', (e) => {
            e.preventDefault();
        })
            .on(form, 'dragover', (event) => {
            if (hasFiles(event.dataTransfer) ||
                hasItems(event.dataTransfer)) {
                form.classList.add('jodit_drag_hover');
                event.preventDefault();
            }
        })
            .on(form, 'dragend dragleave', (event) => {
            form.classList.remove('jodit_drag_hover');
            if (hasFiles(event.dataTransfer)) {
                event.preventDefault();
            }
        })
            .on(form, 'drop', (event) => {
            form.classList.remove('jodit_drag_hover');
            if (hasFiles(event.dataTransfer)) {
                event.preventDefault();
                event.stopImmediatePropagation();
                sendFiles(self, event.dataTransfer.files, handlerSuccess, handlerError).finally(onFinally);
            }
        });
        const inputFile = form.querySelector('input[type=file]');
        if (inputFile) {
            self.j.e.on(inputFile, 'change', () => {
                sendFiles(self, inputFile.files, handlerSuccess, handlerError)
                    .then(() => {
                    inputFile.value = '';
                    if (!/safari/i.test(navigator.userAgent)) {
                        inputFile.type = '';
                        inputFile.type = 'file';
                    }
                })
                    .finally(onFinally);
            });
        }
    }
    /**
     * Upload images to a server by its URL, making it through the connector server.
     */
    uploadRemoteImage(url, handlerSuccess, handlerError) {
        const uploader = this, { o } = uploader;
        const handlerE = isFunction(handlerError)
            ? handlerError
            : o.defaultHandlerError;
        send(uploader, {
            action: 'fileUploadRemote',
            url
        })
            .then(resp => {
            if (o.isSuccess.call(uploader, resp)) {
                const handler = isFunction(handlerSuccess)
                    ? handlerSuccess
                    : o.defaultHandlerSuccess;
                handler.call(uploader, o.process.call(uploader, resp));
                return;
            }
            handlerE.call(uploader, error(o.getMessage.call(uploader, resp)));
        })
            .catch(e => handlerE.call(uploader, e));
    }
    constructor(editor, options) {
        super(editor);
        this.path = '';
        this.source = 'default';
        this.options = ConfigProto(options || {}, ConfigProto(Config.defaultOptions.uploader, isJoditObject(editor) ? editor.o.uploader : {}));
    }
    destruct() {
        this.setStatus(STATUSES.beforeDestruct);
        const instances = ajaxInstances.get(this);
        if (instances) {
            instances.forEach(ajax => {
                try {
                    ajax.destruct();
                }
                catch { }
            });
            instances.clear();
        }
        super.destruct();
    }
}
