/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Component, STATUSES } from "../../component/index.js";
import { isFunction, isNumber, isPlainObject } from "../../helpers/checker/index.js";
import { assert } from "../../helpers/utils/assert.js";
import { error } from "../../helpers/utils/error/index.js";
export function debounce(timeout, firstCallImmediately = false, method = 'debounce') {
    return (target, propertyKey) => {
        const fn = target[propertyKey];
        if (!isFunction(fn)) {
            throw error('Handler must be a Function');
        }
        target.hookStatus(STATUSES.ready, (component) => {
            const { async } = component;
            assert(async != null, `Component ${component.componentName || component.constructor.name} should have "async:IAsync" field`);
            const propTimeout = isFunction(timeout)
                ? timeout(component)
                : timeout;
            const realTimout = isNumber(propTimeout) || isPlainObject(propTimeout)
                ? propTimeout
                : component.defaultTimeout;
            Object.defineProperty(component, propertyKey, {
                configurable: true,
                value: async[method](component[propertyKey].bind(component), realTimout, firstCallImmediately)
            });
        });
        return {
            configurable: true,
            get() {
                return fn.bind(this);
            }
        };
    };
}
/**
 * Wrap function in throttle wrapper
 */
export function throttle(timeout, firstCallImmediately = false) {
    return debounce(timeout, firstCallImmediately, 'throttle');
}
