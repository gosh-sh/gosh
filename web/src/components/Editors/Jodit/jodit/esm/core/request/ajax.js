/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
        r = Reflect.decorate(decorators, target, key, desc);
    else
        for (var i = decorators.length - 1; i >= 0; i--)
            if (d = decorators[i])
                r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Async } from "../async/index.js";
import { autobind } from "../decorators/autobind/autobind.js";
import { buildQuery, ConfigProto, isFunction, isPlainObject, isString, parseQuery } from "../helpers/index.js";
import * as error from "../helpers/utils/error/index.js";
import "./config.js";
import { Response } from "./response.js";
import { Config } from "../../config.js";
export class Ajax {
    className() {
        return 'Ajax';
    }
    constructor(options, defaultAjaxOptions = Config.prototype.defaultAjaxOptions) {
        this.__async = new Async();
        this.__isFulfilled = false;
        this.__activated = false;
        this.__isDestructed = false;
        this.options = ConfigProto(options || {}, defaultAjaxOptions);
        this.xhr = this.o.xhr ? this.o.xhr() : new XMLHttpRequest();
    }
    __buildParams(obj, prefix) {
        if (isPlainObject(obj) &&
            this.options.contentType &&
            this.options.contentType.includes('application/json')) {
            return JSON.stringify(obj);
        }
        if (isFunction(this.o.queryBuild)) {
            return this.o.queryBuild.call(this, obj, prefix);
        }
        if (isString(obj) ||
            obj instanceof window.FormData ||
            (typeof obj === 'object' && obj != null && isFunction(obj.append))) {
            return obj;
        }
        return buildQuery(obj);
    }
    get o() {
        return this.options;
    }
    abort() {
        if (this.__isFulfilled) {
            return this;
        }
        try {
            this.__isFulfilled = true;
            this.xhr.abort();
        }
        catch { }
        return this;
    }
    send() {
        this.__activated = true;
        const { xhr, o } = this;
        const request = this.prepareRequest();
        return this.__async.promise(async (resolve, reject) => {
            const onReject = () => {
                this.__isFulfilled = true;
                reject(error.connection('Connection error'));
            };
            const onResolve = () => {
                this.__isFulfilled = true;
                resolve(new Response(request, xhr.status, xhr.statusText, !xhr.responseType ? xhr.responseText : xhr.response));
            };
            xhr.onload = onResolve;
            xhr.onabort = () => {
                this.__isFulfilled = true;
                reject(error.abort('Abort connection'));
            };
            xhr.onerror = onReject;
            xhr.ontimeout = onReject;
            if (o.responseType) {
                xhr.responseType = o.responseType;
            }
            xhr.onprogress = (e) => {
                let percentComplete = 0;
                if (e.lengthComputable) {
                    percentComplete = (e.loaded / e.total) * 100;
                }
                this.options.onProgress?.(percentComplete);
            };
            xhr.onreadystatechange = () => {
                this.options.onProgress?.(10);
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    if (o.successStatuses.includes(xhr.status)) {
                        onResolve();
                    }
                    else if (xhr.statusText) {
                        this.__isFulfilled = true;
                        reject(error.connection(xhr.statusText));
                    }
                }
            };
            xhr.withCredentials = o.withCredentials ?? false;
            const { url, data, method } = request;
            xhr.open(method, url, true);
            if (o.contentType && xhr.setRequestHeader) {
                xhr.setRequestHeader('Content-type', o.contentType);
            }
            let { headers } = o;
            if (isFunction(headers)) {
                headers = await headers.call(this);
            }
            if (headers && xhr.setRequestHeader) {
                Object.keys(headers).forEach(key => {
                    xhr.setRequestHeader(key, headers[key]);
                });
            }
            // IE
            this.__async.setTimeout(() => {
                xhr.send(data ? this.__buildParams(data) : undefined);
            }, 0);
        });
    }
    prepareRequest() {
        if (!this.o.url) {
            throw error.error('Need URL for AJAX request');
        }
        let url = this.o.url;
        const data = this.o.data;
        const method = (this.o.method || 'get').toLowerCase();
        if (method === 'get' && data && isPlainObject(data)) {
            const qIndex = url.indexOf('?');
            if (qIndex !== -1) {
                const urlData = parseQuery(url);
                url =
                    url.substring(0, qIndex) +
                        '?' +
                        buildQuery({ ...urlData, ...data });
            }
            else {
                url += '?' + buildQuery(this.o.data);
            }
        }
        const request = {
            url,
            method,
            data
        };
        Ajax.log.splice(100);
        Ajax.log.push(request);
        return request;
    }
    destruct() {
        if (!this.__isDestructed) {
            this.__isDestructed = true;
            if (this.__activated && !this.__isFulfilled) {
                this.abort();
                this.__isFulfilled = true;
            }
            this.__async.destruct();
        }
    }
}
Ajax.log = [];
__decorate([
    autobind
], Ajax.prototype, "destruct", null);
