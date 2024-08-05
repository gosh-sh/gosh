/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:modules/table/README.md]]
 * @packageDocumentation
 * @module modules/table
 */
import type { IJodit } from "../../types";
import { ViewComponent } from "../../core/component";
export declare class Table extends ViewComponent<IJodit> {
    /** @override */
    className(): string;
    private selected;
    private static __selectedByTable;
    private __recalculateStyles;
    addSelection(td: HTMLTableCellElement): void;
    removeSelection(td: HTMLTableCellElement): void;
    /**
     * Returns array of selected cells
     */
    getAllSelectedCells(): HTMLTableCellElement[];
    private static __getSelectedCellsByTable;
    /** @override **/
    destruct(): any;
    private static __getRowsCount;
    /**
     * Returns rows count in the table
     */
    getRowsCount(table: HTMLTableElement): number;
    private static __getColumnsCount;
    /**
     * Returns columns count in the table
     */
    getColumnsCount(table: HTMLTableElement): number;
    private static __formalMatrix;
    /**
     * Generate formal table martix columns*rows
     * @param callback - if return false cycle break
     */
    formalMatrix(table: HTMLTableElement, callback?: (cell: HTMLTableCellElement, row: number, col: number, colSpan: number, rowSpan: number) => false | void): HTMLTableCellElement[][];
    private static __formalCoordinate;
    /**
     * Get cell coordinate in formal table (without colspan and rowspan)
     */
    formalCoordinate(table: HTMLTableElement, cell: HTMLTableCellElement, max?: boolean): number[];
    private static __appendRow;
    /**
     * Inserts a new line after row what contains the selected cell
     *
     * @param table - Working table
     * @param line - Insert a new line after/before this
     * line contains the selected cell
     * @param after - Insert a new line after line contains the selected cell
     * @param create - Instance of Create class
     */
    appendRow(table: HTMLTableElement, line: false | HTMLTableRowElement, after: boolean): void;
    private static __removeRow;
    /**
     * Remove row
     */
    removeRow(table: HTMLTableElement, rowIndex: number): void;
    private static __appendColumn;
    /**
     * Insert column before / after all the columns containing the selected cells
     */
    appendColumn(table: HTMLTableElement, j: number, after: boolean): void;
    private static __removeColumn;
    /**
     * Remove column by index
     */
    removeColumn(table: HTMLTableElement, j: number): void;
    private static __getSelectedBound;
    /**
     * Define bound for selected cells
     */
    getSelectedBound(table: HTMLTableElement, selectedCells: HTMLTableCellElement[]): number[][];
    private static __normalizeTable;
    /**
     * Try recalculate all coluns and rows after change
     */
    normalizeTable(table: HTMLTableElement): void;
    private static __mergeSelected;
    /**
     * It combines all of the selected cells into one. The contents of the cells will also be combined
     */
    mergeSelected(table: HTMLTableElement): void;
    private static __splitHorizontal;
    /**
     * Divides all selected by `jodit_focused_cell` class table cell in 2 parts vertical. Those division into 2 columns
     */
    splitHorizontal(table: HTMLTableElement): void;
    private static __splitVertical;
    /**
     * It splits all the selected cells into 2 parts horizontally. Those. are added new row
     */
    splitVertical(table: HTMLTableElement): void;
    private static __setColumnWidthByDelta;
    /**
     * Set column width used delta value
     */
    setColumnWidthByDelta(table: HTMLTableElement, column: number, delta: number, noUnmark: boolean, marked: HTMLTableCellElement[]): void;
    private static __mark;
    private static __unmark;
}
