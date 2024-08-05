/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
export class Response {
    get url() {
        return this.request.url;
    }
    constructor(request, status, statusText, body) {
        this.request = request;
        this.status = status;
        this.statusText = statusText;
        this.body = body;
    }
    async json() {
        return JSON.parse(this.body);
    }
    text() {
        return Promise.resolve(this.body);
    }
    async blob() {
        return this.body;
    }
}
