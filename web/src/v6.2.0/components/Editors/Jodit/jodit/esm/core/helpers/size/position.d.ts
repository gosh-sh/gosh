/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module helpers/size
 */
import type { IBound, IViewBased } from "../../../types";
export declare function position(elm: HTMLElement): IBound;
export declare function position(elm: HTMLElement, jodit: IViewBased): IBound;
export declare function position(elm: HTMLElement, jodit: IViewBased, recurse: boolean): IBound;
