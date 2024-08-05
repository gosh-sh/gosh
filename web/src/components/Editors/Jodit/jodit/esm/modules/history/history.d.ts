/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:modules/history/README.md]]
 * @packageDocumentation
 * @module modules/history
 */
import type { IDestructible, IHistory, IJodit, ISnapshot, SnapshotType } from "../../types";
import { ViewComponent } from "../../core/component";
import { Snapshot } from "./snapshot";
import { Stack } from "./stack";
declare module 'jodit/config' {
    interface Config {
        history: {
            enable: boolean;
            /**
             * Limit of history length
             */
            maxHistoryLength: number;
            /**
             * Delay on every change
             */
            timeout: number;
        };
    }
}
/**
 * The module monitors the status of the editor and creates / deletes the required number of Undo / Redo shots .
 */
export declare class History extends ViewComponent<IJodit> implements IHistory {
    /** @override */
    className(): string;
    /**
     * Return state of the WYSIWYG editor to step back
     */
    redo(): void;
    canRedo(): boolean;
    /**
     * Return the state of the WYSIWYG editor to step forward
     */
    undo(): void;
    canUndo(): boolean;
    clear(): void;
    get length(): number;
    private __startValue;
    protected get startValue(): SnapshotType;
    protected set startValue(value: SnapshotType);
    private readonly __stack;
    snapshot: ISnapshot & IDestructible;
    constructor(editor: IJodit, stack?: Stack, snapshot?: Snapshot);
    private updateTick;
    /**
     * Update change counter
     * @internal
     */
    protected __upTick(): void;
    /**
     * Push new command in stack on some changes
     */
    private onChange;
    /**
     * @internal
     */
    protected __processChanges(): void;
    /**
     * Update history stack
     */
    private updateStack;
    private fireChangeStack;
    destruct(): void;
}
