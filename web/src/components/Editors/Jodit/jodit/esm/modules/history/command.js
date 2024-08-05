/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
export class Command {
    undo() {
        this.history.snapshot.restore(this.oldValue);
    }
    redo() {
        this.history.snapshot.restore(this.newValue);
    }
    constructor(oldValue, newValue, history, tick) {
        this.oldValue = oldValue;
        this.newValue = newValue;
        this.history = history;
        this.tick = tick;
    }
}
