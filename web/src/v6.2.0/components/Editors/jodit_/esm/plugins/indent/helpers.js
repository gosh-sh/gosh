/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/indent
 */
import { Dom } from "../../core/dom/dom.js";
/**
 * Get style rule key for current direction
 * @internal
 */
export const getKey = (direction, box) => `${Dom.isCell(box) ? 'padding' : 'margin'}${direction === 'rtl' ? 'Right' : 'Left'}`;
