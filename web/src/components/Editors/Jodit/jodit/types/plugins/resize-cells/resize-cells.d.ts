/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/resize-cells/README.md]]
 * @packageDocumentation
 * @module plugins/resize-cells
 */
import type { IJodit } from "../../types";
import { Plugin } from "../../modules";
import "./config";

/**
 * Process tables in editor
 */
export declare class resizeCells extends Plugin {
    /**
     * Shortcut for Table module
     */
    private get module();
    /**
     * Now editor has rtl direction
     */
    private get isRTL();
    private selectMode;
    private resizeDelta;
    private resizeHandler;
    private showResizeHandle;
    private hideResizeHandle;
    private createResizeHandle;
    private hideTimeout;
    private drag;
    private wholeTable;
    private workCell;
    private workTable;
    private minX;
    private maxX;
    private startX;
    /**
     * Click on resize handle
     */
    private onHandleMouseDown;
    /**
     * Mouse move after click on resize handle
     */
    private onMouseMove;
    /**
     * Mouse up every where after move and click
     */
    private onMouseUp;
    /**
     * Resize only one column
     */
    private resizeColumns;
    /**
     * Resize whole table
     */
    private resizeTable;
    /**
     * Memoize current cell
     *
     * @param wholeTable - resize whole table by left side,
     * false - resize whole table by right side, null - resize column
     */
    private setWorkCell;
    /**
     * Calc helper resize handle position
     */
    private calcHandlePosition;
    /** @override */
    afterInit(editor: IJodit): void;
    /**
     * Add to every Table listeners
     */
    private observe;
    beforeDestruct(jodit: IJodit): void;
}
