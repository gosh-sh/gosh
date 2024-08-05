/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module modules/file-browser
 */
import type { IDictionary, IFileBrowserItem, IViewBased } from "../../../types";
type ElementsMap = IDictionary<{
    elm: HTMLElement;
    item: IFileBrowserItem;
}>;
/**
 * Returns a map of the file's key correspondence to its DOM element in the file browser
 * @private
 */
export declare const elementsMap: (view: IViewBased) => ElementsMap;
export {};
