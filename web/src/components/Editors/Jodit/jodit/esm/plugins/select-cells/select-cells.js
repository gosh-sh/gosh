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
import { KEY_TAB } from "../../core/constants.js";
import { autobind, watch } from "../../core/decorators/index.js";
import { Dom } from "../../core/dom/dom.js";
import { pluginSystem } from "../../core/global.js";
import { $$, alignElement, position } from "../../core/helpers/index.js";
import { Plugin } from "../../core/plugin/index.js";
import { Table } from "../../modules/table/table.js";
import "./config.js";
const key = 'table_processor_observer';
const MOUSE_MOVE_LABEL = 'onMoveTableSelectCell';
export class selectCells extends Plugin {
    constructor() {
        super(...arguments);
        /**
         * First selected cell
         */
        this.__selectedCell = null;
        /**
         * User is selecting cells now
         */
        this.__isSelectionMode = false;
    }
    /**
     * Shortcut for Jodit.modules.Table
     */
    get __tableModule() {
        return this.j.getInstance(Table, this.j.o);
    }
    afterInit(jodit) {
        if (!jodit.o.tableAllowCellSelection) {
            return;
        }
        jodit.e
            .on('keydown.select-cells', (event) => {
            if (event.key === KEY_TAB) {
                this.unselectCells();
            }
        })
            .on('beforeCommand.select-cells', this.onExecCommand)
            .on('afterCommand.select-cells', this.onAfterCommand)
            // see `plugins/select.ts`
            .on([
            'clickEditor',
            'mousedownTd',
            'mousedownTh',
            'touchstartTd',
            'touchstartTh'
        ]
            .map(e => e + '.select-cells')
            .join(' '), this.onStartSelection)
            // For `clickEditor` correct working. Because `mousedown` on first cell
            // and mouseup on another cell call `click` only for `TR` element.
            .on('clickTr clickTbody', () => {
            const cellsCount = this.__tableModule.getAllSelectedCells().length;
            if (cellsCount) {
                if (cellsCount > 1) {
                    this.j.s.sel?.removeAllRanges();
                }
                return false;
            }
        });
    }
    /**
     * Mouse click inside the table
     */
    onStartSelection(cell) {
        if (this.j.o.readonly) {
            return;
        }
        this.unselectCells();
        if (cell === this.j.editor) {
            return;
        }
        const table = Dom.closest(cell, 'table', this.j.editor);
        if (!cell || !table) {
            return;
        }
        if (!cell.firstChild) {
            cell.appendChild(this.j.createInside.element('br'));
        }
        this.__isSelectionMode = true;
        this.__selectedCell = cell;
        this.__tableModule.addSelection(cell);
        this.j.e
            .on(table, 'mousemove.select-cells touchmove.select-cells', 
        // Don't use decorator because need clear label on mouseup
        this.j.async.throttle(this.__onMove.bind(this, table), {
            label: MOUSE_MOVE_LABEL,
            timeout: this.j.defaultTimeout / 2
        }))
            .on(table, 'mouseup.select-cells touchend.select-cells', this.__onStopSelection.bind(this, table));
        return false;
    }
    onOutsideClick() {
        this.__selectedCell = null;
        this.__onRemoveSelection();
    }
    onChange() {
        if (!this.j.isLocked && !this.__isSelectionMode) {
            this.__onRemoveSelection();
        }
    }
    /**
     * Mouse move inside the table
     */
    __onMove(table, e) {
        if (this.j.o.readonly && !this.j.isLocked) {
            return;
        }
        if (this.j.isLockedNotBy(key)) {
            return;
        }
        const node = this.j.ed.elementFromPoint(e.clientX, e.clientY);
        if (!node) {
            return;
        }
        const cell = Dom.closest(node, ['td', 'th'], table);
        if (!cell || !this.__selectedCell) {
            return;
        }
        if (cell !== this.__selectedCell) {
            this.j.lock(key);
        }
        this.unselectCells();
        const bound = this.__tableModule.getSelectedBound(table, [
            cell,
            this.__selectedCell
        ]), box = this.__tableModule.formalMatrix(table);
        for (let i = bound[0][0]; i <= bound[1][0]; i += 1) {
            for (let j = bound[0][1]; j <= bound[1][1]; j += 1) {
                this.__tableModule.addSelection(box[i][j]);
            }
        }
        const cellsCount = this.__tableModule.getAllSelectedCells().length;
        if (cellsCount > 1) {
            this.j.s.sel?.removeAllRanges();
        }
        this.j.e.fire('hidePopup');
        e.stopPropagation();
        // Hack for FireFox for force redraw selection
        (() => {
            const n = this.j.createInside.fromHTML('<div style="color:rgba(0,0,0,0.01);width:0;height:0">&nbsp;</div>');
            cell.appendChild(n);
            this.j.async.setTimeout(() => {
                n.parentNode?.removeChild(n);
            }, this.j.defaultTimeout / 5);
        })();
    }
    /**
     * On click in outside - remove selection
     */
    __onRemoveSelection(e) {
        if (!e?.buffer?.actionTrigger &&
            !this.__selectedCell &&
            this.__tableModule.getAllSelectedCells().length) {
            this.j.unlock();
            this.unselectCells();
            this.j.e.fire('hidePopup', 'cells');
            return;
        }
        this.__isSelectionMode = false;
        this.__selectedCell = null;
    }
    /**
     * Stop a selection process
     */
    __onStopSelection(table, e) {
        if (!this.__selectedCell) {
            return;
        }
        this.__isSelectionMode = false;
        this.j.unlock();
        const node = this.j.ed.elementFromPoint(e.clientX, e.clientY);
        if (!node) {
            return;
        }
        const cell = Dom.closest(node, ['td', 'th'], table);
        if (!cell) {
            return;
        }
        const ownTable = Dom.closest(cell, 'table', table);
        if (ownTable && ownTable !== table) {
            return; // Nested tables
        }
        const bound = this.__tableModule.getSelectedBound(table, [
            cell,
            this.__selectedCell
        ]), box = this.__tableModule.formalMatrix(table);
        const max = box[bound[1][0]][bound[1][1]], min = box[bound[0][0]][bound[0][1]];
        this.j.e.fire('showPopup', table, () => {
            const minOffset = position(min, this.j), maxOffset = position(max, this.j);
            return {
                left: minOffset.left,
                top: minOffset.top,
                width: maxOffset.left - minOffset.left + maxOffset.width,
                height: maxOffset.top - minOffset.top + maxOffset.height
            };
        }, 'cells');
        $$('table', this.j.editor).forEach(table => {
            this.j.e.off(table, 'mousemove.select-cells touchmove.select-cells mouseup.select-cells touchend.select-cells');
        });
        this.j.async.clearTimeout(MOUSE_MOVE_LABEL);
    }
    /**
     * Remove selection for all cells
     */
    unselectCells(currentCell) {
        const module = this.__tableModule;
        const cells = module.getAllSelectedCells();
        if (cells.length) {
            cells.forEach(cell => {
                if (!currentCell || currentCell !== cell) {
                    module.removeSelection(cell);
                }
            });
        }
    }
    /**
     * Execute custom commands for table
     */
    onExecCommand(command) {
        if (/table(splitv|splitg|merge|empty|bin|binrow|bincolumn|addcolumn|addrow)/.test(command)) {
            command = command.replace('table', '');
            const cells = this.__tableModule.getAllSelectedCells();
            if (cells.length) {
                const [cell] = cells;
                if (!cell) {
                    return;
                }
                const table = Dom.closest(cell, 'table', this.j.editor);
                if (!table) {
                    return;
                }
                switch (command) {
                    case 'splitv':
                        this.__tableModule.splitVertical(table);
                        break;
                    case 'splitg':
                        this.__tableModule.splitHorizontal(table);
                        break;
                    case 'merge':
                        this.__tableModule.mergeSelected(table);
                        break;
                    case 'empty':
                        cells.forEach(td => Dom.detach(td));
                        break;
                    case 'bin':
                        Dom.safeRemove(table);
                        break;
                    case 'binrow':
                        new Set(cells.map(td => td.parentNode)).forEach(row => {
                            this.__tableModule.removeRow(table, row.rowIndex);
                        });
                        break;
                    case 'bincolumn':
                        {
                            const columnsSet = new Set(), columns = cells.reduce((acc, td) => {
                                if (!columnsSet.has(td.cellIndex)) {
                                    acc.push(td);
                                    columnsSet.add(td.cellIndex);
                                }
                                return acc;
                            }, []);
                            columns.forEach(td => {
                                this.__tableModule.removeColumn(table, td.cellIndex);
                            });
                        }
                        break;
                    case 'addcolumnafter':
                    case 'addcolumnbefore':
                        this.__tableModule.appendColumn(table, cell.cellIndex, command === 'addcolumnafter');
                        break;
                    case 'addrowafter':
                    case 'addrowbefore':
                        this.__tableModule.appendRow(table, cell.parentNode, command === 'addrowafter');
                        break;
                }
            }
            return false;
        }
    }
    /**
     * Add some align after native command
     */
    onAfterCommand(command) {
        if (/^justify/.test(command)) {
            this.__tableModule
                .getAllSelectedCells()
                .forEach(elm => alignElement(command, elm));
        }
    }
    /** @override */
    beforeDestruct(jodit) {
        this.__onRemoveSelection();
        jodit.e.off('.select-cells');
    }
}
selectCells.requires = ['select'];
__decorate([
    autobind
], selectCells.prototype, "onStartSelection", null);
__decorate([
    watch(':outsideClick')
], selectCells.prototype, "onOutsideClick", null);
__decorate([
    watch(':change')
], selectCells.prototype, "onChange", null);
__decorate([
    autobind
], selectCells.prototype, "__onRemoveSelection", null);
__decorate([
    autobind
], selectCells.prototype, "__onStopSelection", null);
__decorate([
    autobind
], selectCells.prototype, "onExecCommand", null);
__decorate([
    autobind
], selectCells.prototype, "onAfterCommand", null);
pluginSystem.add('selectCells', selectCells);
