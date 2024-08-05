/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
        r = Reflect.decorate(decorators, target, key, desc);
    else
        for (var i = decorators.length - 1; i >= 0; i--)
            if (d = decorators[i])
                r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { ViewComponent } from "../../core/component/index.js";
import { debounce } from "../../core/decorators/index.js";
import { Command } from "./command.js";
import { Snapshot } from "./snapshot.js";
import { Stack } from "./stack.js";
import { Config } from "../../config.js";
Config.prototype.history = {
    enable: true,
    maxHistoryLength: Infinity,
    timeout: 1000
};
/**
 * The module monitors the status of the editor and creates / deletes the required number of Undo / Redo shots .
 */
export class History extends ViewComponent {
    /** @override */
    className() {
        return 'History';
    }
    /**
     * Return state of the WYSIWYG editor to step back
     */
    redo() {
        if (this.__stack.redo()) {
            this.startValue = this.snapshot.make();
            this.fireChangeStack();
        }
    }
    canRedo() {
        return this.__stack.canRedo();
    }
    /**
     * Return the state of the WYSIWYG editor to step forward
     */
    undo() {
        if (this.__stack.undo()) {
            this.startValue = this.snapshot.make();
            this.fireChangeStack();
        }
    }
    canUndo() {
        return this.__stack.canUndo();
    }
    clear() {
        this.startValue = this.snapshot.make();
        this.__stack.clear();
        this.fireChangeStack();
    }
    get length() {
        return this.__stack.length;
    }
    get startValue() {
        return this.__startValue;
    }
    set startValue(value) {
        this.__startValue = value;
    }
    constructor(editor, stack = new Stack(editor.o.history.maxHistoryLength), snapshot = new Snapshot(editor)) {
        super(editor);
        this.updateTick = 0;
        this.__stack = stack;
        this.snapshot = snapshot;
        if (editor.o.history.enable) {
            editor.e.on('afterAddPlace.history', () => {
                if (this.isInDestruct) {
                    return;
                }
                this.startValue = this.snapshot.make();
                editor.events
                    // save selection
                    .on('internalChange internalUpdate', () => {
                    this.startValue = this.snapshot.make();
                })
                    .on(editor.editor, [
                    'changeSelection',
                    'selectionstart',
                    'selectionchange',
                    'mousedown',
                    'mouseup',
                    'keydown',
                    'keyup'
                ]
                    .map(f => f + '.history')
                    .join(' '), () => {
                    if (this.startValue.html ===
                        this.j.getNativeEditorValue()) {
                        this.startValue = this.snapshot.make();
                    }
                })
                    .on(this, 'change.history', this.onChange);
            });
        }
    }
    /**
     * Update change counter
     * @internal
     */
    __upTick() {
        this.updateTick += 1;
    }
    /**
     * Push new command in stack on some changes
     */
    onChange() {
        this.__processChanges();
    }
    /**
     * @internal
     */
    __processChanges() {
        if (this.snapshot.isBlocked || !this.j.o.history.enable) {
            return;
        }
        this.updateStack();
    }
    /**
     * Update history stack
     */
    updateStack(replace = false) {
        const newValue = this.snapshot.make();
        if (!Snapshot.equal(newValue, this.startValue)) {
            const newCommand = new Command(this.startValue, newValue, this, this.updateTick);
            if (replace) {
                const command = this.__stack.current();
                if (command && this.updateTick === command.tick) {
                    this.__stack.replace(newCommand);
                }
            }
            else {
                this.__stack.push(newCommand);
            }
            this.startValue = newValue;
            this.fireChangeStack();
        }
    }
    fireChangeStack() {
        this.j && !this.j.isInDestruct && this.j.events?.fire('changeStack');
    }
    destruct() {
        if (this.isInDestruct) {
            return;
        }
        if (this.j.events) {
            this.j.e.off('.history');
        }
        this.snapshot.destruct();
        super.destruct();
    }
}
__decorate([
    debounce()
], History.prototype, "onChange", null);
