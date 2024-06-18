/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * Check if user disable local storages/cookie etc.
 */
export const canUsePersistentStorage = (() => {
    const canUse = () => {
        const tmpKey = '___Jodit___' + Math.random().toString();
        try {
            localStorage.setItem(tmpKey, '1');
            const result = localStorage.getItem(tmpKey) === '1';
            localStorage.removeItem(tmpKey);
            return result;
        }
        catch { }
        return false;
    };
    let result;
    return () => {
        if (result === undefined) {
            result = canUse();
        }
        return result;
    };
})();
/**
 * Persistent storage in localStorage
 */
export class LocalStorageProvider {
    set(key, value) {
        try {
            const buffer = localStorage.getItem(this.rootKey);
            const json = buffer ? JSON.parse(buffer) : {};
            json[key] = value;
            localStorage.setItem(this.rootKey, JSON.stringify(json));
        }
        catch { }
        return this;
    }
    delete(key) {
        try {
            localStorage.removeItem(this.rootKey);
        }
        catch { }
        return this;
    }
    get(key) {
        try {
            const buffer = localStorage.getItem(this.rootKey);
            const json = buffer ? JSON.parse(buffer) : {};
            return json[key] !== undefined ? json[key] : null;
        }
        catch { }
    }
    exists(key) {
        return this.get(key) != null;
    }
    constructor(rootKey) {
        this.rootKey = rootKey;
    }
    clear() {
        try {
            localStorage.removeItem(this.rootKey);
        }
        catch { }
        return this;
    }
}
