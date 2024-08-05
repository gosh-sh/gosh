/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import type { IJodit } from "../../../../types";
/**
 * If the selection area is inside an element that matches the commit (suitable relative),
 * but does not completely fill it.
 * Then the method cuts the parent and leaves itself in a copy of the parent (suitable relative) in the middle.
 *
 * @example
 * Apply strong to
 * ```html
 * 	<strong><span>some<font>SELECTED</font>text</span></strong>
 * ```
 * Should extract selection from parent `strong`
 * ```html
 * `<strong><span>some</span></strong><strong><span><font>SELECTED</font></span></strong><strong><span>test</span></strong>
 * ```
 * @private
 */
export declare function extractSelectedPart(wrapper: HTMLElement, font: HTMLElement, jodit: IJodit): void;
