/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
export class LimitedStack {
    constructor(limit) {
        this.limit = limit;
        this.stack = [];
    }
    push(item) {
        this.stack.push(item);
        if (this.stack.length > this.limit) {
            this.stack.shift();
        }
        return this;
    }
    pop() {
        return this.stack.pop();
    }
    find(clb) {
        return this.stack.find(clb);
    }
}
