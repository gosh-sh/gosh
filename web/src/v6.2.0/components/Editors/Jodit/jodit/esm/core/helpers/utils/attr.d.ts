/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module helpers/utils
 */
import type { IDictionary } from "../../../types";
/**
 * Get attribute
 */
export declare function attr(elm: Element, key: string): null | string;
/**
 * Remove attribute
 */
export declare function attr(elm: Element, key: string, value: null): void;
/**
 * Set attribute
 */
export declare function attr(elm: Element, key: string, value: string | number | boolean | undefined | null): null;
/**
 * Set or remove several attributes
 */
export declare function attr(elm: Element, attributes: IDictionary<string | number | boolean | null>): null;
