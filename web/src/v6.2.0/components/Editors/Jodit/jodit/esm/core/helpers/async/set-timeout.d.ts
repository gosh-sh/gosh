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
export declare function setTimeout<T = any>(callback: (...args: T[]) => void, timeout: number, ...args: T[]): number;
/**
 * Clear timeout
 */
export declare function clearTimeout(timer: number): void;
