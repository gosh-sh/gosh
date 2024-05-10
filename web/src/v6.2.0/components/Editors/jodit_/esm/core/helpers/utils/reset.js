/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { IS_PROD } from "../../constants.js";
import { isFunction } from "../checker/is-function.js";
import { get } from "./get.js";
const map = {};
/**
 * Reset Vanilla JS native function
 * @example
 * ```js
 * reset('Array.from')(Set([1,2,3])) // [1, 2, 3]
 * ```
 * You must use the function derived from the method immediately as its iframe is being removed
 */
export function reset(key) {
    if (!(key in map)) {
        const iframe = document.createElement('iframe');
        try {
            iframe.src = 'about:blank';
            document.body.appendChild(iframe);
            if (!iframe.contentWindow) {
                return null;
            }
            const func = get(key, iframe.contentWindow), bind = get(key.split('.').slice(0, -1).join('.'), iframe.contentWindow);
            if (isFunction(func)) {
                map[key] = func.bind(bind);
            }
        }
        catch (e) {
            if (!IS_PROD) {
                throw e;
            }
        }
        finally {
            iframe.parentNode?.removeChild(iframe);
        }
    }
    return map[key] ?? null;
}
