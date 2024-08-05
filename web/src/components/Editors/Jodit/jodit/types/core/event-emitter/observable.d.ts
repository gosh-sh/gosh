/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module event-emitter
 */
import type { IDictionary, IObservable } from "../../types";
/**
 * Makes any object an observable object
 * @example
 * ```js
 * const obj = {
 *   a: 1,
 *   b: {
 *     c: 5
 *   }
 * }
 *
 * const obsObj = Jodit.modules.observable(obj);
 * console.log(obj === obsObj); // true
 * obsObj.on('change', () => {
 *   console.log('Object changed');
 * });
 * obsObj.on('change.a', () => {
 *   console.log('Key a changed');
 * });
 * obsObj.on('change.b.c', () => {
 *   console.log('Key b.c changed');
 * });
 *
 * obj.a = 6;
 * // Object changed
 * // Key a changed
 *
 * obj.b = {c: 6}
 * // Object changed
 *
 * obj.b.c = 8
 * // Object changed
 * // Key b.c changed
 * ```
 */
export declare function observable<T extends IDictionary, O extends T & IObservable>(obj: T): O;
