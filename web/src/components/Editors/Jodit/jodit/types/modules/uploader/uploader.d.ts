/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:modules/uploader/README.md]]
 * @packageDocumentation
 * @module modules/uploader
 */
import type { HandlerError, HandlerSuccess, IUploader, IUploaderOptions, IViewBased } from "../../types";
import { ViewComponent } from "../../core/component";
import "./config";

export declare class Uploader extends ViewComponent implements IUploader {
    readonly jodit: IViewBased;
    get j(): IViewBased;
    /** @override */
    className(): string;
    path: string;
    source: string;
    readonly options: IUploaderOptions<IUploader>;
    get o(): this['options'];
    /**
     * It sets the path for uploading files
     */
    setPath(path: string): this;
    /**
     * It sets the source for connector
     */
    setSource(source: string): this;
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
    bind(form: HTMLElement, handlerSuccess?: HandlerSuccess, handlerError?: HandlerError): void;
    private attachEvents;
    /**
     * Upload images to a server by its URL, making it through the connector server.
     */
    uploadRemoteImage(url: string, handlerSuccess?: HandlerSuccess, handlerError?: HandlerError): void;
    constructor(editor: IViewBased, options?: IUploaderOptions<Uploader>);
    destruct(): any;
}
