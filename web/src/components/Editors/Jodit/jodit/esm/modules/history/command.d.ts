/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module modules/history
 */
import type { SnapshotType } from "../../types";
import type { History } from "./history";
export declare class Command {
    readonly oldValue: SnapshotType;
    readonly newValue: SnapshotType;
    private readonly history;
    readonly tick: number;
    undo(): void;
    redo(): void;
    constructor(oldValue: SnapshotType, newValue: SnapshotType, history: History, tick: number);
}
