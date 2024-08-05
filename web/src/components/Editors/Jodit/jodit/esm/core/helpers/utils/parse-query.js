/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * Parse query string
 */
export const parseQuery = (queryString) => {
    const query = {}, a = queryString.substring(1).split('&');
    for (let i = 0; i < a.length; i += 1) {
        const keyValue = a[i].split('=');
        query[decodeURIComponent(keyValue[0])] = decodeURIComponent(keyValue[1] || '');
    }
    return query;
};
