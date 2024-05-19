/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module modules/history
 */
import type { IJodit, ISnapshot, SnapshotType } from "../../types";
import { ViewComponent } from "../../core/component";
/**
 * Module for creating snapshot of editor which includes html content and the current selection
 */
export declare class Snapshot extends ViewComponent<IJodit> implements ISnapshot {
    /** @override */
    className(): string;
    /**
     * Compare two snapshotes, if and htmls and selections match, then return true
     *
     * @param first - the first snapshote
     * @param second - second shot
     */
    static equal(first: SnapshotType, second: SnapshotType): boolean;
    /**
     * Calc count element before some node in parentNode. All text nodes are joined
     */
    private static countNodesBeforeInParent;
    /**
     * Calc normal offset in joined text nodes
     */
    private static strokeOffset;
    /**
     * Calc whole hierarchy path before some element in editor's tree
     */
    private calcHierarchyLadder;
    private getElementByLadder;
    private __isBlocked;
    get isBlocked(): boolean;
    private __block;
    transaction(changes: () => void): void;
    /**
     * Creates object a snapshot of editor: html and the current selection. Current selection calculate by
     * offset by start document
     * \{html: string, range: \{startContainer: int, startOffset: int, endContainer: int, endOffset: int\}\} or
     * \{html: string\} without selection
     */
    make(): SnapshotType;
    /**
     * Restores the state of the editor of the snapshot. Rebounding is not only html but selected text
     *
     * @param snapshot - snapshot of editor resulting from the `[[Snapshot.make]]` method
     * @see make
     */
    restore(snapshot: SnapshotType): void;
    private storeScrollState;
    private restoreScrollState;
    /**
     * Restore selection from snapshot
     *
     * @param snapshot - snapshot of editor resulting from the [[Snapshot.make]] method
     * @see make
     */
    restoreOnlySelection(snapshot: SnapshotType): void;
    destruct(): void;
    private static isIgnoredNode;
    private removeJoditSelection;
}
