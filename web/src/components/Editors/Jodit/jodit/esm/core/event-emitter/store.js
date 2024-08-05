/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { toArray } from "../helpers/array/to-array.js";
import { assert } from "../helpers/utils/assert.js";
export const defaultNameSpace = 'JoditEventDefaultNamespace';
export class EventHandlersStore {
    constructor() {
        this.__store = new Map();
    }
    get(event, namespace) {
        if (this.__store.has(namespace)) {
            const ns = this.__store.get(namespace);
            assert(ns, '-');
            return ns[event];
        }
    }
    indexOf(event, namespace, originalCallback) {
        const blocks = this.get(event, namespace);
        if (blocks) {
            for (let i = 0; i < blocks.length; i += 1) {
                if (blocks[i].originalCallback === originalCallback) {
                    return i;
                }
            }
        }
        return false;
    }
    namespaces(withoutDefault = false) {
        const nss = toArray(this.__store.keys());
        return withoutDefault ? nss.filter(ns => ns !== defaultNameSpace) : nss;
    }
    events(namespace) {
        const ns = this.__store.get(namespace);
        return ns ? Object.keys(ns) : [];
    }
    set(event, namespace, data, onTop = false) {
        let ns = this.__store.get(namespace);
        if (!ns) {
            ns = {};
            this.__store.set(namespace, ns);
        }
        if (ns[event] === undefined) {
            ns[event] = [];
        }
        if (!onTop) {
            ns[event].push(data);
        }
        else {
            ns[event].unshift(data);
        }
    }
    clear() {
        this.__store.clear();
    }
    clearEvents(namespace, event) {
        const ns = this.__store.get(namespace);
        if (ns && ns[event]) {
            delete ns[event];
            if (!Object.keys(ns).length) {
                this.__store.delete(namespace);
            }
        }
    }
    isEmpty() {
        return this.__store.size === 0;
    }
}
