/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module helpers/checker
 */
import type { IDictionary } from "../../../types";
/**
 * Check if element is simple plaint object
 */
export declare function isPlainObject<T>(obj: any | IDictionary<T>): obj is IDictionary<T>;
