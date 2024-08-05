/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import type { IDictionary } from "../../../../types";
/**
 * Compares whether the given attributes match the element's own attributes
 * @private
 */
export declare function isSameAttributes(elm: HTMLElement, attrs?: IDictionary): elm is HTMLElement;
export declare function elementsEqualAttributes(elm1: HTMLElement, elm2: HTMLElement): boolean;
