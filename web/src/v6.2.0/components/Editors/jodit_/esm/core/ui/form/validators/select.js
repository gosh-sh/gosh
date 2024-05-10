/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { trim } from "../../../helpers/string/trim.js";
/**
 * Select is required
 */
export const required = function (select) {
    if (!trim(select.value).length) {
        select.error = 'Please fill out this field';
        return false;
    }
    return true;
};
