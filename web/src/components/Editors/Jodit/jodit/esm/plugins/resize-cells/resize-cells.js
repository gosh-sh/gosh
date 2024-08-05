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
import * as consts from "../../core/constants.js";
import { autobind } from "../../core/decorators/index.js";
import { Dom } from "../../core/dom/dom.js";
import { pluginSystem } from "../../core/global.js";
import { $$, call, dataBind, getContentWidth, offset } from "../../core/helpers/index.js";
import { Plugin, Table } from "../../modules/index.js";
import "./config.js";
const key = 'table_processor_observer-resize';
/**
 * Process tables in editor
 */
export class resizeCells extends Plugin {
    constructor() {
        super(...arguments);
        this.selectMode = false;
        this.resizeDelta = 0;
        this.createResizeHandle = () => {
            if (!this.resizeHandler) {
                this.resizeHandler = this.j.c.div('jodit-table-resizer');
                this.j.e
                    .on(this.resizeHandler, 'mousedown.table touchstart.table', this.onHandleMouseDown)
                    .on(this.resizeHandler, 'mouseenter.table', () => {
                    this.j.async.clearTimeout(this.hideTimeout);
                });
            }
        };
        this.hideTimeout = 0;
        this.drag = false;
        this.minX = 0;
        this.maxX = 0;
        this.startX = 0;
    }
    /**
     * Shortcut for Table module
     */
    get module() {
        return this.j.getInstance('Table', this.j.o);
    }
    /**
     * Now editor has rtl direction
     */
    get isRTL() {
        return this.j.o.direction === 'rtl';
    }
    showResizeHandle() {
        this.j.async.clearTimeout(this.hideTimeout);
        this.j.workplace.appendChild(this.resizeHandler);
    }
    hideResizeHandle() {
        this.hideTimeout = this.j.async.setTimeout(() => {
            Dom.safeRemove(this.resizeHandler);
        }, {
            timeout: this.j.defaultTimeout,
            label: 'hideResizer'
        });
    }
    /**
     * Click on resize handle
     */
    onHandleMouseDown(event) {
        if (this.j.isLocked) {
            return;
        }
        this.drag = true;
        this.j.e
            .on(this.j.ow, 'mouseup.resize-cells touchend.resize-cells', this.onMouseUp)
            .on(this.j.ew, 'mousemove.table touchmove.table', this.onMouseMove);
        this.startX = event.clientX;
        this.j.lock(key);
        this.resizeHandler.classList.add('jodit-table-resizer_moved');
        let box, tableBox = this.workTable.getBoundingClientRect();
        this.minX = 0;
        this.maxX = 1000000;
        if (this.wholeTable != null) {
            tableBox = this.workTable.parentNode.getBoundingClientRect();
            this.minX = tableBox.left;
            this.maxX = this.minX + tableBox.width;
        }
        else {
            // find maximum columns
            const coordinate = this.module.formalCoordinate(this.workTable, this.workCell, true);
            this.module.formalMatrix(this.workTable, (td, i, j) => {
                if (coordinate[1] === j) {
                    box = td.getBoundingClientRect();
                    this.minX = Math.max(box.left + consts.NEARBY / 2, this.minX);
                }
                if (coordinate[1] + (this.isRTL ? -1 : 1) === j) {
                    box = td.getBoundingClientRect();
                    this.maxX = Math.min(box.left + box.width - consts.NEARBY / 2, this.maxX);
                }
            });
        }
        return false;
    }
    /**
     * Mouse move after click on resize handle
     */
    onMouseMove(event) {
        if (!this.drag) {
            return;
        }
        this.j.e.fire('closeAllPopups');
        let x = event.clientX;
        const workplacePosition = offset((this.resizeHandler.parentNode ||
            this.j.od.documentElement), this.j, this.j.od, true);
        if (x < this.minX) {
            x = this.minX;
        }
        if (x > this.maxX) {
            x = this.maxX;
        }
        this.resizeDelta =
            x - this.startX + (!this.j.o.iframe ? 0 : workplacePosition.left);
        this.resizeHandler.style.left =
            x - (this.j.o.iframe ? 0 : workplacePosition.left) + 'px';
        const sel = this.j.s.sel;
        sel && sel.removeAllRanges();
    }
    /**
     * Mouse up every where after move and click
     */
    onMouseUp(e) {
        if (this.selectMode || this.drag) {
            this.selectMode = false;
            this.j.unlock();
        }
        if (!this.resizeHandler || !this.drag) {
            return;
        }
        this.drag = false;
        this.j.e.off(this.j.ew, 'mousemove.table touchmove.table', this.onMouseMove);
        this.resizeHandler.classList.remove('jodit-table-resizer_moved');
        if (this.startX !== e.clientX) {
            // resize column
            if (this.wholeTable == null) {
                this.resizeColumns();
            }
            else {
                this.resizeTable();
            }
        }
        this.j.synchronizeValues();
        this.j.s.focus();
    }
    /**
     * Resize only one column
     */
    resizeColumns() {
        const delta = this.resizeDelta;
        const marked = [];
        const tableModule = this.module;
        tableModule.setColumnWidthByDelta(this.workTable, tableModule.formalCoordinate(this.workTable, this.workCell, true)[1], delta, true, marked);
        const nextTD = call(this.isRTL ? Dom.prev : Dom.next, this.workCell, Dom.isCell, this.workCell.parentNode);
        tableModule.setColumnWidthByDelta(this.workTable, tableModule.formalCoordinate(this.workTable, nextTD)[1], -delta, false, marked);
    }
    /**
     * Resize whole table
     */
    resizeTable() {
        const delta = this.resizeDelta * (this.isRTL ? -1 : 1);
        const width = this.workTable.offsetWidth, parentWidth = getContentWidth(this.workTable.parentNode, this.j.ew);
        // for RTL use mirror logic
        const rightSide = !this.wholeTable;
        const needChangeWidth = this.isRTL ? !rightSide : rightSide;
        // right side
        if (needChangeWidth) {
            this.workTable.style.width =
                ((width + delta) / parentWidth) * 100 + '%';
        }
        else {
            const side = this.isRTL ? 'marginRight' : 'marginLeft';
            const margin = parseInt(this.j.ew.getComputedStyle(this.workTable)[side] || '0', 10);
            this.workTable.style.width =
                ((width - delta) / parentWidth) * 100 + '%';
            this.workTable.style[side] =
                ((margin + delta) / parentWidth) * 100 + '%';
        }
    }
    /**
     * Memoize current cell
     *
     * @param wholeTable - resize whole table by left side,
     * false - resize whole table by right side, null - resize column
     */
    setWorkCell(cell, wholeTable = null) {
        this.wholeTable = wholeTable;
        this.workCell = cell;
        this.workTable = Dom.up(cell, (elm) => Dom.isTag(elm, 'table'), this.j.editor);
    }
    /**
     * Calc helper resize handle position
     */
    calcHandlePosition(table, cell, offsetX = 0, delta = 0) {
        const box = offset(cell, this.j, this.j.ed);
        if (offsetX > consts.NEARBY && offsetX < box.width - consts.NEARBY) {
            this.hideResizeHandle();
            return;
        }
        const workplacePosition = offset(this.j.workplace, this.j, this.j.od, true), parentBox = offset(table, this.j, this.j.ed);
        this.resizeHandler.style.left =
            (offsetX <= consts.NEARBY ? box.left : box.left + box.width) -
                workplacePosition.left +
                delta +
                'px';
        Object.assign(this.resizeHandler.style, {
            height: parentBox.height + 'px',
            top: parentBox.top - workplacePosition.top + 'px'
        });
        this.showResizeHandle();
        if (offsetX <= consts.NEARBY) {
            const prevTD = call(this.isRTL ? Dom.next : Dom.prev, cell, Dom.isCell, cell.parentNode);
            this.setWorkCell(prevTD || cell, prevTD ? null : true);
        }
        else {
            const nextTD = call(!this.isRTL ? Dom.next : Dom.prev, cell, Dom.isCell, cell.parentNode);
            this.setWorkCell(cell, !nextTD ? false : null);
        }
    }
    /** @override */
    afterInit(editor) {
        if (!editor.o.tableAllowCellResize) {
            return;
        }
        editor.e
            .off(this.j.ow, '.resize-cells')
            .off('.resize-cells')
            .on('change.resize-cells afterCommand.resize-cells afterSetMode.resize-cells', () => {
            $$('table', editor.editor).forEach(this.observe);
        })
            .on(this.j.ow, 'scroll.resize-cells', () => {
            if (!this.drag) {
                return;
            }
            const parent = Dom.up(this.workCell, (elm) => Dom.isTag(elm, 'table'), editor.editor);
            if (parent) {
                const parentBox = parent.getBoundingClientRect();
                this.resizeHandler.style.top = parentBox.top + 'px';
            }
        })
            .on('beforeSetMode.resize-cells', () => {
            const tableModule = this.module;
            tableModule.getAllSelectedCells().forEach(td => {
                tableModule.removeSelection(td);
                tableModule.normalizeTable(Dom.closest(td, 'table', editor.editor));
            });
        });
    }
    /**
     * Add to every Table listeners
     */
    observe(table) {
        if (dataBind(table, key)) {
            return;
        }
        dataBind(table, key, true);
        this.j.e
            .on(table, 'mouseleave.resize-cells', (e) => {
            if (this.resizeHandler &&
                this.resizeHandler !== e.relatedTarget) {
                this.hideResizeHandle();
            }
        })
            .on(table, 'mousemove.resize-cells touchmove.resize-cells', this.j.async.throttle((event) => {
            if (this.j.isLocked) {
                return;
            }
            const cell = Dom.up(event.target, Dom.isCell, table);
            if (!cell) {
                return;
            }
            this.calcHandlePosition(table, cell, event.offsetX);
        }, {
            timeout: this.j.defaultTimeout
        }));
        this.createResizeHandle();
    }
    beforeDestruct(jodit) {
        if (jodit.events) {
            jodit.e.off(this.j.ow, '.resize-cells');
            jodit.e.off('.resize-cells');
        }
    }
}
__decorate([
    autobind
], resizeCells.prototype, "onHandleMouseDown", null);
__decorate([
    autobind
], resizeCells.prototype, "onMouseMove", null);
__decorate([
    autobind
], resizeCells.prototype, "onMouseUp", null);
__decorate([
    autobind
], resizeCells.prototype, "observe", null);
pluginSystem.add('resizeCells', resizeCells);
