/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Component, STATUSES } from "../../component/index.js";
import { isFunction } from "../../helpers/checker/is-function.js";
import { error } from "../../helpers/utils/error/index.js";
export function idle() {
    return (target, propertyKey) => {
        if (!isFunction(target[propertyKey])) {
            throw error('Handler must be a Function');
        }
        target.hookStatus(STATUSES.ready, (component) => {
            const { async } = component;
            const originalMethod = component[propertyKey];
            component[propertyKey] = (...args) => async.requestIdleCallback(originalMethod.bind(component, ...args));
        });
    };
}
