/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module helpers/string
 */
import { INVISIBLE_SPACE } from "../../constants.js";
/**
 * Finds the position of the substring in the string, if any, and returns the length of the found subsequence.
 * Unlike `indexOf` ignores INVISIBLE_SPACE and may fail at `maxDistance` characters
 */
export function fuzzySearchIndex(needle, haystack, offset = 0, maxDistance = 1) {
    let i = 0, j = 0, startIndex = -1, len = 0, errorDistance = 0;
    for (j = offset; i < needle.length && j < haystack.length;) {
        if (needle[i].toLowerCase() === haystack[j].toLowerCase()) {
            i++;
            len++;
            errorDistance = 0;
            if (startIndex === -1) {
                startIndex = j;
            }
        }
        else if (i > 0) {
            if (errorDistance >= maxDistance &&
                haystack[j] !== INVISIBLE_SPACE) {
                i = 0;
                startIndex = -1;
                len = 0;
                errorDistance = 0;
                j--;
            }
            else {
                errorDistance++;
                len++;
            }
        }
        j++;
    }
    return i === needle.length ? [startIndex, len] : [-1, 0];
}
