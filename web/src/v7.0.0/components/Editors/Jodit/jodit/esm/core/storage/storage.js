/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { camelCase } from "../helpers/string/camel-case.js";
import { canUsePersistentStorage, LocalStorageProvider } from "./engines/local-storage-provider.js";
import { MemoryStorageProvider } from "./engines/memory-storage-provider.js";
export const StorageKey = 'Jodit_';
export class Storage {
    set(key, value) {
        this.provider.set(camelCase(this.prefix + key), value);
        return this;
    }
    delete(key) {
        this.provider.delete(camelCase(this.prefix + key));
        return this;
    }
    get(key) {
        return this.provider.get(camelCase(this.prefix + key));
    }
    exists(key) {
        return this.provider.exists(camelCase(this.prefix + key));
    }
    clear() {
        this.provider.clear();
        return this;
    }
    constructor(provider, suffix) {
        this.provider = provider;
        this.prefix = StorageKey;
        if (suffix) {
            this.prefix += suffix;
        }
    }
    static makeStorage(persistent = false, suffix) {
        let provider;
        if (persistent && canUsePersistentStorage()) {
            provider = new LocalStorageProvider(StorageKey + suffix);
        }
        if (!provider) {
            provider = new MemoryStorageProvider();
        }
        return new Storage(provider, suffix);
    }
}
