/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import type { ICommitStyle, IJodit } from "../../../../../types";
/**
 * Replaces non-leaf items with leaf items and either creates a new list or
 * adds a new item to the nearest old list
 * @private
 */
export declare function wrapList(commitStyle: ICommitStyle, wrapper: HTMLElement, jodit: IJodit): HTMLElement;
