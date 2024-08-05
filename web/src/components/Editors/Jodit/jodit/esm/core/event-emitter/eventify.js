/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
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
export class Eventify {
    constructor() {
        this.__map = new Map();
    }
    on(name, func) {
        if (!this.__map.has(name)) {
            this.__map.set(name, new Set());
        }
        this.__map.get(name)?.add(func);
        return this;
    }
    off(name, func) {
        if (this.__map.has(name)) {
            this.__map.get(name)?.delete(func);
        }
        return this;
    }
    destruct() {
        this.__map.clear();
    }
    emit(name, ...args) {
        let result;
        if (this.__map.has(name)) {
            this.__map.get(name)?.forEach(cb => {
                result = cb(...args);
            });
        }
        return result;
    }
}
