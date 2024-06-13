/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module modules/uploader
 */
import type { IDictionary, IUploader, IUploaderAnswer } from "../../../types";
import { Ajax } from "../../../core/request";
export declare const ajaxInstances: WeakMap<IUploader, Set<Ajax>>;
export declare function send(uploader: IUploader, data: FormData | IDictionary<string>): Promise<IUploaderAnswer>;
