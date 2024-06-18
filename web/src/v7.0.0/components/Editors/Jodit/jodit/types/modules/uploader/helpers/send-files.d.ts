/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module modules/uploader
 */
import type { HandlerError, HandlerSuccess, IUploader } from "../../../types";
/**
 * Send files to server
 */
export declare function sendFiles(uploader: IUploader, files: FileList | File[] | null, handlerSuccess?: HandlerSuccess, handlerError?: HandlerError, process?: (form: FormData) => void): Promise<any>;
