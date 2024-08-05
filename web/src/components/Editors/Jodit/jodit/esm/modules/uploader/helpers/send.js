/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { isFunction, isPromise } from "../../../core/helpers/index.js";
import { Ajax } from "../../../core/request/index.js";
import { buildData } from "./build-data.js";
export const ajaxInstances = new WeakMap();
export function send(uploader, data) {
    const requestData = buildData(uploader, data);
    const sendData = (request) => {
        const ajax = new Ajax({
            xhr: () => {
                const xhr = new XMLHttpRequest();
                if (uploader.j.ow.FormData !== undefined &&
                    xhr.upload) {
                    uploader.j.progressbar.show().progress(10);
                    xhr.upload.addEventListener('progress', evt => {
                        if (evt.lengthComputable) {
                            let percentComplete = evt.loaded / evt.total;
                            percentComplete *= 100;
                            uploader.j.progressbar
                                .show()
                                .progress(percentComplete);
                            if (percentComplete >= 100) {
                                uploader.j.progressbar.hide();
                            }
                        }
                    }, false);
                }
                else {
                    uploader.j.progressbar.hide();
                }
                return xhr;
            },
            method: uploader.o.method || 'POST',
            data: request,
            url: isFunction(uploader.o.url)
                ? uploader.o.url(request)
                : uploader.o.url,
            headers: uploader.o.headers,
            queryBuild: uploader.o.queryBuild,
            contentType: uploader.o.contentType.call(uploader, request),
            withCredentials: uploader.o.withCredentials || false
        });
        let instances = ajaxInstances.get(uploader);
        if (!instances) {
            instances = new Set();
            ajaxInstances.set(uploader, instances);
        }
        instances.add(ajax);
        uploader.j.e.one('beforeDestruct', ajax.destruct);
        return ajax
            .send()
            .then(resp => resp.json())
            .catch(error => {
            return {
                success: false,
                data: {
                    messages: [error]
                }
            };
        })
            .finally(() => {
            ajax.destruct();
            instances?.delete(ajax);
        });
    };
    if (isPromise(requestData)) {
        return requestData.then(sendData).catch(error => {
            uploader.o.error.call(uploader, error);
        });
    }
    return sendData(requestData);
}
