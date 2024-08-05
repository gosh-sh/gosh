/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Config } from "../../config.js";
Config.prototype.defaultAjaxOptions = {
    successStatuses: [200, 201, 202],
    method: 'GET',
    url: '',
    data: null,
    contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
    headers: {
        'X-REQUESTED-WITH': 'XMLHttpRequest' // compatible with jQuery
    },
    withCredentials: false,
    xhr() {
        return new XMLHttpRequest();
    }
};
