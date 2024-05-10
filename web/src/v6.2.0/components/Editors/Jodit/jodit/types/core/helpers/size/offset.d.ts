/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module helpers/size
 */
/**
 * Calc relative offset by start editor field
 * @returns returns an object containing the properties top and left.
 */
import type { IBound, IViewBased } from "../../../types";
export declare const offset: (elm: HTMLElement | Range, jodit: IViewBased, doc: Document, recurse?: boolean) => IBound;
