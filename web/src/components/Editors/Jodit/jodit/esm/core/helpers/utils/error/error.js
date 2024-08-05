/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module helpers/utils
 */
import { ConnectionError, OptionsError } from "./errors/index.js";
/**
 * Helper for create Error object
 */
export function error(message) {
    return new TypeError(message);
}
export function connection(message) {
    return new ConnectionError(message);
}
export function options(message) {
    return new OptionsError(message);
}
