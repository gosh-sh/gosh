/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { getPropertyDescriptor } from "../decorators/watch/watch.js";
import { isArray } from "../helpers/checker/is-array.js";
import { isFastEqual } from "../helpers/checker/is-equal.js";
import { isPlainObject } from "../helpers/checker/is-plain-object.js";
const OBSERVABLE_OBJECT = Symbol('observable-object');
function isObservableObject(obj) {
    return obj[OBSERVABLE_OBJECT] !== undefined;
}
/**
 * Makes any object an observable object
 * @example
 * ```js
 * const obj = {
 *   a: 1,
 *   b: {
 *     c: 5
 *   }
 * }
 *
 * const obsObj = Jodit.modules.observable(obj);
 * console.log(obj === obsObj); // true
 * obsObj.on('change', () => {
 *   console.log('Object changed');
 * });
 * obsObj.on('change.a', () => {
 *   console.log('Key a changed');
 * });
 * obsObj.on('change.b.c', () => {
 *   console.log('Key b.c changed');
 * });
 *
 * obj.a = 6;
 * // Object changed
 * // Key a changed
 *
 * obj.b = {c: 6}
 * // Object changed
 *
 * obj.b.c = 8
 * // Object changed
 * // Key b.c changed
 * ```
 */
export function observable(obj) {
    if (isObservableObject(obj)) {
        return obj;
    }
    const __lockEvent = {};
    const __onEvents = {};
    const on = (event, callback) => {
        if (isArray(event)) {
            event.map(e => on(e, callback));
            return obj;
        }
        if (!__onEvents[event]) {
            __onEvents[event] = [];
        }
        __onEvents[event].push(callback);
        return obj;
    };
    const fire = (event, ...attr) => {
        if (isArray(event)) {
            event.map(e => fire(e, ...attr));
            return;
        }
        try {
            if (!__lockEvent[event] && __onEvents[event]) {
                __lockEvent[event] = true;
                __onEvents[event].forEach(clb => clb.call(obj, ...attr));
            }
        }
        finally {
            __lockEvent[event] = false;
        }
    };
    const initAccessors = (dict, prefixes = []) => {
        const store = {};
        if (isObservableObject(dict)) {
            return;
        }
        Object.defineProperty(dict, OBSERVABLE_OBJECT, {
            enumerable: false,
            value: true
        });
        Object.keys(dict).forEach(_key => {
            const key = _key;
            const prefix = prefixes.concat(key).filter(a => a.length);
            store[key] = dict[key];
            const descriptor = getPropertyDescriptor(dict, key);
            Object.defineProperty(dict, key, {
                set: (value) => {
                    const oldValue = store[key];
                    if (!isFastEqual(store[key], value)) {
                        fire([
                            'beforeChange',
                            `beforeChange.${prefix.join('.')}`
                        ], key, value);
                        if (isPlainObject(value)) {
                            initAccessors(value, prefix);
                        }
                        if (descriptor && descriptor.set) {
                            descriptor.set.call(obj, value);
                        }
                        else {
                            store[key] = value;
                        }
                        const sum = [];
                        fire([
                            'change',
                            ...prefix.reduce((rs, p) => {
                                sum.push(p);
                                rs.push(`change.${sum.join('.')}`);
                                return rs;
                            }, [])
                        ], prefix.join('.'), oldValue, value?.valueOf
                            ? value.valueOf()
                            : value);
                    }
                },
                get: () => {
                    if (descriptor && descriptor.get) {
                        return descriptor.get.call(obj);
                    }
                    return store[key];
                },
                enumerable: true,
                configurable: true
            });
            if (isPlainObject(store[key])) {
                initAccessors(store[key], prefix);
            }
        });
        Object.defineProperty(obj, 'on', {
            value: on
        });
    };
    initAccessors(obj);
    return obj;
}
