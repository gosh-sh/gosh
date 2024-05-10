/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { isFunction } from "../../helpers/checker/is-function.js";
import { error } from "../../helpers/utils/error/index.js";
/**
 * Call on some component status
 */
export function hook(status) {
    return (target, propertyKey) => {
        if (!isFunction(target[propertyKey])) {
            throw error('Handler must be a Function');
        }
        target.hookStatus(status, (component) => {
            component[propertyKey].call(component);
        });
    };
}
