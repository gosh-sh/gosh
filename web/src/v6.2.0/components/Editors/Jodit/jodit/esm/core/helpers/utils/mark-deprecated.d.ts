/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module helpers/utils
 */
/**
 * By default, terser will remove all `console.*` but
 * if you use this object it will not be
 */
export declare const cns: Console;
/**
 * Mark function as deprecated
 */
export declare function markDeprecated(method: Function, names?: string[], ctx?: any): (...args: any[]) => void;
