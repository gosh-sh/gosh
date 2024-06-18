/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module helpers/utils
 */
import { isAbortError } from "../../../checker/is-abort-error.js";
export function abort(message = 'Aborted') {
    return new DOMException(message, 'AbortError');
}
/**
 * @deprecated use `isAbortError` instead
 */
export const isAbort = isAbortError;
