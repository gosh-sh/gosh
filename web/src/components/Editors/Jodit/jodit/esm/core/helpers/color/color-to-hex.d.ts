/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module helpers/color
 */
/**
 * Converts rgba text representation of color in hex
 *
 * @param color - string like rgba(red, green, blue, alpha) or rgb(red, green, blue)
 * @returns hex color view, NaN - for transparent color
 * @example
 * ```javascript
 * var p = document.createElement('p');
 * p.style.color = '#ffffff';
 * console.log(p.getAttribute('style')); // color: rgb(255, 255, 255);
 * console.log(colorTohex(p.style.color)); // #ffffff
 * ```
 */
export declare const colorToHex: (color: string) => string | false;
