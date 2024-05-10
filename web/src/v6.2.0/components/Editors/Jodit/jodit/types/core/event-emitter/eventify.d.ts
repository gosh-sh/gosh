/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module event-emitter
 */
import type { CanUndef, IDestructible } from "../../types";
/**
 * Class for adding event handling capability
 *
 * ```ts
 * class SomeClass extends Eventify<{ start: (node: Node) => boolean; }> {
 * 	constructor() {
 * 		super();
 * 		setTimeout(() => {
 * 			if (this.emit('start', document.body)) {
 * 				console.log('yes');
 * 			};
 * 		}, 100);
 * 	}
 * }
 *
 * const sm = new SomeClass();
 * sm.on('start', (node) => {
 * 	console.log(node);
 * 	return true;
 * })
 * ```
 */
export declare abstract class Eventify<MAP extends {
    [key: string]: (...args: any[]) => any;
}, EVENT extends keyof MAP = keyof MAP> implements IDestructible {
    private __map;
    on(name: EVENT, func: MAP[EVENT]): this;
    off(name: keyof MAP, func: MAP[EVENT]): this;
    destruct(): void;
    protected emit(name: EVENT, ...args: Parameters<MAP[EVENT]>): CanUndef<ReturnType<MAP[EVENT]>>;
}
