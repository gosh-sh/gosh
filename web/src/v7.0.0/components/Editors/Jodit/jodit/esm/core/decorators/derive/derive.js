/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:core/decorators/derive/README.md]]
 * @packageDocumentation
 * @module decorators/derive
 */
import { isFunction } from "../../helpers/checker/is-function.js";
export function derive(...traits) {
    return (target) => {
        const origin = target.prototype;
        for (let i = 0; i < traits.length; i++) {
            const trait = traits[i];
            const keys = Object.getOwnPropertyNames(trait.prototype);
            for (let j = 0; j < keys.length; j++) {
                const key = keys[j], method = Object.getOwnPropertyDescriptor(trait.prototype, key);
                const canDerive = method != null &&
                    isFunction(method.value) &&
                    !isFunction(origin[key]);
                if (canDerive) {
                    Object.defineProperty(origin, key, {
                        enumerable: true,
                        configurable: true,
                        writable: true,
                        value: function (...args) {
                            return method.value.call(this, ...args);
                        }
                    });
                }
            }
        }
    };
}
