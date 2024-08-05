/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module modules/file-browser
 */
import type { HTMLTagNames, IDictionary, IFileBrowser, IFileBrowserItem, Nullable } from "../../../types";
/**
 * @private
 */
export declare const getItem: (node: Nullable<EventTarget>, root: HTMLElement, tag?: HTMLTagNames) => Nullable<HTMLElement>;
/**
 * @private
 */
export declare const elementToItem: (elm: HTMLElement, elementsMap: IDictionary<{
    elm: HTMLElement;
    item: IFileBrowserItem;
}>) => IFileBrowserItem | void;
/**
 * @private
 */
export declare function nativeListeners(this: IFileBrowser): void;
