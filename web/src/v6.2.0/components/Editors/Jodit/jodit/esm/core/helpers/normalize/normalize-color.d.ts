/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * Convert rgba and short HEX color to Full text color. #fff to #FFFFFF
 *
 * @param colorInput - string like rgba(red, green, blue, alpha) or rgb(red, green, blue) or #fff or #ffffff
 * @returns HEX color, false - for transparent color
 */
export declare const normalizeColor: (colorInput: string) => string | false;
