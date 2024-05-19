/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { isFunction, isString } from "../../../core/helpers/index.js";
export function buildData(uploader, data) {
    if (isFunction(uploader.o.buildData)) {
        return uploader.o.buildData.call(uploader, data);
    }
    const FD = uploader.ow.FormData;
    if (FD !== undefined) {
        if (data instanceof FD) {
            return data;
        }
        if (isString(data)) {
            return data;
        }
        const newData = new FD();
        const dict = data;
        Object.keys(dict).forEach(key => {
            newData.append(key, dict[key]);
        });
        return newData;
    }
    return data;
}
