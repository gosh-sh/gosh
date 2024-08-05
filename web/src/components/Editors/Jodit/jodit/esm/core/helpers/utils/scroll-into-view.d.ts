/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module helpers/utils
 */
import type { Nullable } from "../../../types";
/**
 * @module helpers/utils
 */
/**
 * Check if element is in view
 */
export declare function inView(elm: HTMLElement, root: HTMLElement, doc: Document): boolean;
/**
 * Scroll element into view if it is not in view
 */
export declare function scrollIntoViewIfNeeded(elm: Nullable<Node>, root: HTMLElement, doc: Document): void;
