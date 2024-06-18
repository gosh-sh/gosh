/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * It clears the line of all auxiliary invisible characters , from the spaces and line breaks , tabs
 * from the beginning and end of the line
 */
export declare function trim(value: string): string;
export declare function trimChars(value: string, chars: string): string;
/**
 * Trim only invisible chars
 */
export declare function trimInv(value: string): string;
