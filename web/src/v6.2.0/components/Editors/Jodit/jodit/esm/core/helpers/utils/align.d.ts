/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module helpers/utils
 */
import type { ImageHAlign } from "../../../types";
/**
 * Align image
 */
export declare function hAlignElement(image: HTMLElement, align: ImageHAlign): void;
/**
 * Remove text-align style for all selected children
 */
export declare function clearAlign(node: Node): void;
/**
 * Apply align for element
 */
export declare function alignElement(command: string, box: HTMLElement): void;
