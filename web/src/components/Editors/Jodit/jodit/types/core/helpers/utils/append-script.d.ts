/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module helpers/utils
 */
import type { IViewBased } from "../../../types";
export type Loader = (jodit: IViewBased, url: string) => Promise<any>;
export interface CallbackAndElement {
    callback: EventListener;
    element: HTMLElement;
}
/**
 * Load script and return promise
 */
export declare const appendScriptAsync: Loader;
/**
 * Download CSS style script
 */
export declare const appendStyleAsync: Loader;
export declare function loadNext(jodit: IViewBased, urls: string[], i?: number): Promise<void>;
export declare function loadNextStyle(jodit: IViewBased, urls: string[], i?: number): Promise<void>;
