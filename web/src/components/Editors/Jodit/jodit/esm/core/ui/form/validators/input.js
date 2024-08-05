/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { isURL } from "../../../helpers/checker/is-url.js";
import { trim } from "../../../helpers/string/trim.js";
/**
 * Input is required
 */
export const required = function (input) {
    if (!trim(input.value).length) {
        input.error = 'Please fill out this field';
        return false;
    }
    return true;
};
/**
 * Input value should be valid URL
 */
export const url = function (input) {
    if (!isURL(trim(input.value))) {
        input.error = 'Please enter a web address';
        return false;
    }
    return true;
};
