/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
export class MemoryStorageProvider {
    constructor() {
        this.data = new Map();
    }
    set(key, value) {
        this.data.set(key, value);
        return this;
    }
    delete(key) {
        this.data.delete(key);
        return this;
    }
    get(key) {
        return this.data.get(key);
    }
    exists(key) {
        return this.data.has(key);
    }
    clear() {
        this.data.clear();
        return this;
    }
}
