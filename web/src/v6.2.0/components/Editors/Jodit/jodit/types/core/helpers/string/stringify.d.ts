/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * Safe stringify circular object
 */
export declare function stringify(value: unknown, options?: {
    excludeKeys?: string[];
    prettify?: string;
}): string;
