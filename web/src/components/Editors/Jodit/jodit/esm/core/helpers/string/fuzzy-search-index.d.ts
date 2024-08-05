/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * Finds the position of the substring in the string, if any, and returns the length of the found subsequence.
 * Unlike `indexOf` ignores INVISIBLE_SPACE and may fail at `maxDistance` characters
 */
export declare function fuzzySearchIndex(needle: string, haystack: string, offset?: number, maxDistance?: number): [
    number,
    number
];
