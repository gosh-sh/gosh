/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module helpers/utils
 */
import type { IStyle, StyleValue } from "../../../types";
export declare function css(element: HTMLElement, key: keyof CSSStyleDeclaration): string | number;
export declare function css(element: HTMLElement, key: string | IStyle): string | number;
export declare function css(element: HTMLElement, key: string | IStyle, value: StyleValue): string | number;
export declare function css(element: HTMLElement, key: string | IStyle, onlyStyleMode: boolean): string | number;
/**
 * Clear center align
 */
export declare const clearCenterAlign: (image: HTMLElement) => void;
