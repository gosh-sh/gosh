/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { STATUSES } from "../../component/statuses.js";
import { observable } from "../../event-emitter/observable.js";
import { splitArray } from "../../helpers/array/split-array.js";
import { isFunction } from "../../helpers/checker/is-function.js";
import { isPlainObject } from "../../helpers/checker/is-plain-object.js";
import { isViewObject } from "../../helpers/checker/is-view-object.js";
import { error } from "../../helpers/utils/error/index.js";
export function getPropertyDescriptor(obj, prop) {
    let desc;
    do {
        desc = Object.getOwnPropertyDescriptor(obj, prop);
        obj = Object.getPrototypeOf(obj);
    } while (!desc && obj);
    return desc;
}
/**
 * Watch decorator. Added observer for some change in field value
 */
export function watch(observeFields, opts) {
    return (target, propertyKey) => {
        if (!isFunction(target[propertyKey])) {
            throw error('Handler must be a Function');
        }
        const immediately = opts?.immediately ?? true;
        const context = opts?.context;
        const process = (component) => {
            const view = isViewObject(component)
                ? component
                : component.jodit;
            let callback = (key, ...args) => {
                if (component.isInDestruct) {
                    return;
                }
                return component[propertyKey](key, ...args);
            };
            if (!immediately) {
                callback = component.async.microDebounce(callback, true);
            }
            splitArray(observeFields).forEach(field => {
                if (/:/.test(field)) {
                    const [objectPath, eventName] = field.split(':');
                    let ctx = context;
                    if (objectPath.length) {
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        ctx = component.get(objectPath);
                    }
                    if (isFunction(ctx)) {
                        ctx = ctx(component);
                    }
                    view.events.on(ctx || component, eventName, callback);
                    if (!ctx) {
                        view.events.on(eventName, callback);
                    }
                    component.hookStatus('beforeDestruct', () => {
                        view.events
                            .off(ctx || component, eventName, callback)
                            .off(eventName, callback);
                    });
                    return;
                }
                const parts = field.split('.'), [key] = parts, teil = parts.slice(1);
                let value = component[key];
                if (isPlainObject(value)) {
                    const observableValue = observable(value);
                    observableValue.on(`change.${teil.join('.')}`, callback);
                }
                const descriptor = getPropertyDescriptor(target, key);
                Object.defineProperty(component, key, {
                    configurable: true,
                    set(v) {
                        const oldValue = value;
                        if (oldValue === v) {
                            return;
                        }
                        value = v;
                        if (descriptor && descriptor.set) {
                            descriptor.set.call(component, v);
                        }
                        if (isPlainObject(value)) {
                            value = observable(value);
                            value.on(`change.${teil.join('.')}`, callback);
                        }
                        callback(key, oldValue, value);
                    },
                    get() {
                        if (descriptor && descriptor.get) {
                            return descriptor.get.call(component);
                        }
                        return value;
                    }
                });
            });
        };
        if (isFunction(target.hookStatus)) {
            target.hookStatus(STATUSES.ready, process);
        }
        else {
            process(target);
        }
    };
}
