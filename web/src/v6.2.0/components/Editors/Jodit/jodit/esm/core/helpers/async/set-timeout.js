/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module helpers/async
 */
/**
 * Create async callback if set timeout value - else call function immediately
 */
export function setTimeout(callback, timeout, ...args) {
    if (!timeout) {
        callback.call(null, ...args);
    }
    else {
        return window.setTimeout(callback, timeout, ...args);
    }
    return 0;
}
/**
 * Clear timeout
 */
export function clearTimeout(timer) {
    window.clearTimeout(timer);
}
