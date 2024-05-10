/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module helpers/utils
 */
import type { CanPromise, IControlType, IJodit, IViewBased, Nullable, RejectablePromise } from "../../../types";
/**
 * Call function with parameters
 *
 * @example
 * ```js
 * const f = Math.random();
 * Jodit.modules.Helpers.call(f > 0.5 ? Math.ceil : Math.floor, f);
 * ```
 */
export declare function call<T extends any[], R>(func: (...args: T) => R, ...args: T): R;
/**
 * Mark element for debugging
 */
export declare function markOwner(jodit: IViewBased, elm: HTMLElement): void;
export declare function callPromise(condition: CanPromise<unknown>, callback?: () => CanPromise<any>): CanPromise<void>;
/**
 * Allow load image in promise
 */
export declare const loadImage: (src: string, jodit: IViewBased) => RejectablePromise<HTMLImageElement>;
export declare const keys: (obj: object, own?: boolean) => string[];
/**
 * Memorize last user chose
 */
export declare const memorizeExec: <T extends IJodit = IJodit>(editor: T, _: unknown, { control }: {
    control: IControlType<T>;
}, preProcessValue?: (value: string) => string) => void | false;
/**
 * Get DataTransfer from different event types
 */
export declare const getDataTransfer: (event: ClipboardEvent | DragEvent) => Nullable<DataTransfer>;
