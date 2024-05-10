/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../core/dom/index.js";
import { pluginSystem } from "../../core/global.js";
import { $$ } from "../../core/helpers/index.js";
import { trim } from "../../core/helpers/string/trim.js";
import { Plugin } from "../../core/plugin/index.js";
import "./interface.js";
export class deleteCommand extends Plugin {
    afterInit(jodit) {
        jodit.e.on('afterCommand.delete', (command) => {
            if (command === 'delete') {
                this.__afterDeleteCommand();
            }
        });
        jodit.registerCommand('delete', {
            exec: this.__onDeleteCommand.bind(this)
        }, {
            stopPropagation: false
        });
    }
    beforeDestruct(jodit) {
        jodit.e.off('afterCommand.delete');
    }
    /**
     * After Delete command remove extra BR
     */
    __afterDeleteCommand() {
        const jodit = this.j;
        const current = jodit.s.current();
        if (current && Dom.isTag(current.firstChild, 'br')) {
            jodit.s.removeNode(current.firstChild);
        }
        if (!trim(jodit.editor.textContent || '') &&
            !jodit.editor.querySelector('img,table,jodit,iframe,hr') &&
            (!current || !Dom.closest(current, 'table', jodit.editor))) {
            jodit.editor.innerHTML = '';
            const node = jodit.s.setCursorIn(jodit.editor);
            jodit.s.removeNode(node);
        }
    }
    __onDeleteCommand() {
        const { jodit } = this;
        if (jodit.s.isCollapsed()) {
            return;
        }
        jodit.s.expandSelection();
        const range = jodit.s.range;
        range.deleteContents();
        const fake = jodit.createInside.fake();
        range.insertNode(fake);
        const leftSibling = Dom.findSibling(fake, true);
        const rightSibling = Dom.findSibling(fake, false);
        this.__moveContentInLeftSibling(fake, leftSibling, rightSibling);
        range.setStartBefore(fake);
        range.collapse(true);
        this.__moveCursorInEditableSibling(jodit, leftSibling, fake, range);
        this.__addBrInEmptyBlock(fake, rightSibling, range);
        Dom.safeRemove(fake);
        jodit.s.selectRange(range);
        return false;
    }
    __moveContentInLeftSibling(fake, leftSibling, rightSibling) {
        leftSibling = this.__defineRightLeftBox(leftSibling);
        if (!Dom.isList(rightSibling) &&
            !Dom.isTag(rightSibling, 'table') &&
            Dom.isBlock(rightSibling) &&
            Dom.isBlock(leftSibling)) {
            Dom.append(leftSibling, fake);
            Dom.moveContent(rightSibling, leftSibling);
            Dom.safeRemove(rightSibling);
        }
        // Remove empty right LI
        if (Dom.isList(rightSibling) &&
            Dom.isLeaf(rightSibling.firstElementChild) &&
            Dom.isEmpty(rightSibling.firstElementChild)) {
            Dom.safeRemove(rightSibling.firstElementChild);
        }
    }
    /**
     * If left sibling is list - return last leaf
     */
    __defineRightLeftBox(leftSibling) {
        if (!Dom.isList(leftSibling)) {
            return leftSibling;
        }
        let lastLeaf = leftSibling.lastElementChild;
        if (!Dom.isLeaf(lastLeaf)) {
            lastLeaf = this.j.createInside.element('li');
            Dom.append(leftSibling, lastLeaf);
        }
        return lastLeaf;
    }
    /**
     * Add BR in empty blocks left and right(for table cell)
     */
    __addBrInEmptyBlock(fake, rightSibling, range) {
        const jodit = this.j;
        if (fake.isConnected &&
            Dom.isBlock(fake.parentNode) &&
            !fake.nextSibling &&
            !fake.previousSibling) {
            const br = jodit.createInside.element('br');
            Dom.after(fake, br);
            range.setStartBefore(br);
            range.collapse(true);
        }
        // Add BR in the right empty table cell
        if (Dom.isTag(rightSibling, 'table')) {
            const firstCell = $$('td,th', rightSibling).shift();
            if (Dom.isCell(firstCell) && Dom.isEmpty(firstCell)) {
                Dom.append(firstCell, jodit.createInside.element('br'));
            }
        }
    }
    __moveCursorInEditableSibling(jodit, leftSibling, fake, range) {
        if (!leftSibling || !Dom.isText(leftSibling)) {
            const root = Dom.closest(fake, Dom.isBlock, jodit.editor) ?? jodit.editor;
            const leftText = Dom.prev(fake, Dom.isText, root);
            if (leftText) {
                range.setStartAfter(leftText);
                range.collapse(true);
                Dom.safeRemove(fake);
            }
        }
    }
}
deleteCommand.requires = ['backspace'];
pluginSystem.add('deleteCommand', deleteCommand);
