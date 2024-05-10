/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module modules/history
 */
import type { CanUndef, IStack } from "../../types";
import type { Command } from "./command";
export declare class Stack implements IStack {
    private readonly size;
    private readonly commands;
    private stackPosition;
    constructor(size: number);
    get length(): number;
    private clearRedo;
    clear(): void;
    push(command: Command): void;
    replace(command: Command): void;
    current(): CanUndef<Command>;
    undo(): boolean;
    redo(): boolean;
    canUndo(): boolean;
    canRedo(): boolean;
}
