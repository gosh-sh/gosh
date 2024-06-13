/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
export class Stack {
    constructor(size) {
        this.size = size;
        this.commands = [];
        this.stackPosition = -1;
    }
    get length() {
        return this.commands.length;
    }
    clearRedo() {
        this.commands.length = this.stackPosition + 1;
    }
    clear() {
        this.commands.length = 0;
        this.stackPosition = -1;
    }
    push(command) {
        this.clearRedo();
        this.commands.push(command);
        this.stackPosition += 1;
        if (this.commands.length > this.size) {
            this.commands.shift();
            this.stackPosition -= 1;
        }
    }
    replace(command) {
        this.commands[this.stackPosition] = command;
    }
    current() {
        return this.commands[this.stackPosition];
    }
    undo() {
        if (this.canUndo()) {
            if (this.commands[this.stackPosition]) {
                this.commands[this.stackPosition].undo();
            }
            this.stackPosition -= 1;
            return true;
        }
        return false;
    }
    redo() {
        if (this.canRedo()) {
            this.stackPosition += 1;
            if (this.commands[this.stackPosition]) {
                this.commands[this.stackPosition].redo();
            }
            return true;
        }
        return false;
    }
    canUndo() {
        return this.stackPosition >= 0;
    }
    canRedo() {
        return this.stackPosition < this.commands.length - 1;
    }
}
