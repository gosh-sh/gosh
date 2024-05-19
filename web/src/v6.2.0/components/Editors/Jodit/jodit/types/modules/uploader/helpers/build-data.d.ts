/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module modules/uploader
 */
import type { BuildDataResult, IDictionary, IUploader } from "../../../types";
export declare function buildData(uploader: IUploader, data: FormData | IDictionary<string> | string): BuildDataResult;
