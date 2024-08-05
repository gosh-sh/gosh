/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/select-cells/README.md]]
 * @packageDocumentation
 * @module plugins/select-cells
 */
import type { IJodit } from "../../types";
import { Plugin } from "../../core/plugin";
import "./config";
export declare class selectCells extends Plugin {
    static requires: string[];
    /**
     * Shortcut for Jodit.modules.Table
     */
    private get __tableModule();
    protected afterInit(jodit: IJodit): void;
    /**
     * First selected cell
     */
    private __selectedCell;
    /**
     * User is selecting cells now
     */
    private __isSelectionMode;
    /**
     * Mouse click inside the table
     */
    protected onStartSelection(cell: HTMLTableCellElement): void | false;
    protected onOutsideClick(): void;
    protected onChange(): void;
    /**
     * Mouse move inside the table
     */
    private __onMove;
    /**
     * On click in outside - remove selection
     */
    private __onRemoveSelection;
    /**
     * Stop a selection process
     */
    private __onStopSelection;
    /**
     * Remove selection for all cells
     */
    private unselectCells;
    /**
     * Execute custom commands for table
     */
    private onExecCommand;
    /**
     * Add some align after native command
     */
    private onAfterCommand;
    /** @override */
    protected beforeDestruct(jodit: IJodit): void;
}
