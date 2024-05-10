/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { STATUSES } from "../../component/statuses.js";
import { isFunction } from "../../helpers/checker/is-function.js";
import { error } from "../../helpers/utils/error/index.js";
export function wait(condition) {
    return (target, propertyKey) => {
        const fn = target[propertyKey];
        if (!isFunction(fn)) {
            throw error('Handler must be a Function');
        }
        target.hookStatus(STATUSES.ready, (component) => {
            const { async } = component;
            const realMethod = component[propertyKey];
            let timeout = 0;
            Object.defineProperty(component, propertyKey, {
                configurable: true,
                value: function callProxy(...args) {
                    async.clearTimeout(timeout);
                    if (condition(component)) {
                        realMethod.apply(component, args);
                    }
                    else {
                        timeout = async.setTimeout(() => callProxy(...args), 10);
                    }
                }
            });
        });
    };
}
