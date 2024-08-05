/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { INVISIBLE_SPACE, IS_PROD } from "../../core/constants.js";
import { Dom } from "../../core/dom/index.js";
import { pluginSystem } from "../../core/global.js";
import { isFunction } from "../../core/helpers/checker/is-function.js";
import { Plugin } from "../../core/plugin/index.js";
import { moveNodeInsideStart } from "../../core/selection/helpers/index.js";
import "./config.js";
import { checkNotCollapsed } from "./cases/check-not-collapsed.js";
import { cases } from "./cases/index.js";
export class backspace extends Plugin {
    afterInit(jodit) {
        jodit
            .registerCommand('deleteButton', {
            exec: () => this.onDelete(false),
            hotkeys: jodit.o.delete.hotkeys.delete
        }, {
            stopPropagation: false
        })
            .registerCommand('backspaceButton', {
            exec: () => this.onDelete(true),
            hotkeys: jodit.o.delete.hotkeys.backspace
        }, {
            stopPropagation: false
        })
            .registerCommand('deleteWordButton', {
            exec: () => this.onDelete(false, 'word'),
            hotkeys: jodit.o.delete.hotkeys.deleteWord
        })
            .registerCommand('backspaceWordButton', {
            exec: () => this.onDelete(true, 'word'),
            hotkeys: jodit.o.delete.hotkeys.backspaceWord
        })
            .registerCommand('deleteSentenceButton', {
            exec: () => this.onDelete(false, 'sentence'),
            hotkeys: jodit.o.delete.hotkeys.deleteSentence
        })
            .registerCommand('backspaceSentenceButton', {
            exec: () => this.onDelete(true, 'sentence'),
            hotkeys: jodit.o.delete.hotkeys.backspaceSentence
        });
    }
    beforeDestruct(jodit) {
        jodit.e.off('afterCommand.delete');
    }
    /**
     * Listener BackSpace or Delete button
     */
    onDelete(backspace, mode = 'char') {
        const jodit = this.j;
        const sel = jodit.selection;
        if (!sel.isFocused()) {
            sel.focus();
        }
        if (checkNotCollapsed(jodit)) {
            return false;
        }
        const range = sel.range;
        const fakeNode = jodit.createInside.text(INVISIBLE_SPACE);
        try {
            Dom.safeInsertNode(range, fakeNode);
            if (!Dom.isOrContains(jodit.editor, fakeNode)) {
                return;
            }
            if (jodit.e.fire('backSpaceBeforeCases', backspace, fakeNode)) {
                return false;
            }
            moveNodeInsideStart(jodit, fakeNode, backspace);
            if (cases.some((func) => {
                if (isFunction(func) &&
                    func(jodit, fakeNode, backspace, mode)) {
                    if (!IS_PROD) {
                        console.info('Remove case:', func.name);
                    }
                    return true;
                }
            })) {
                return false;
            }
        }
        catch (e) {
            if (!IS_PROD) {
                console.error(e);
            }
            throw e;
        }
        finally {
            jodit.e.fire('backSpaceAfterDelete', backspace, fakeNode);
            this.safeRemoveEmptyNode(fakeNode);
        }
        return false;
    }
    /**
     * Remove node and replace cursor position out of it
     */
    safeRemoveEmptyNode(fakeNode) {
        const { range } = this.j.s;
        if (range.startContainer === fakeNode) {
            if (fakeNode.previousSibling) {
                if (Dom.isText(fakeNode.previousSibling)) {
                    range.setStart(fakeNode.previousSibling, fakeNode.previousSibling.nodeValue?.length ?? 0);
                }
                else {
                    range.setStartAfter(fakeNode.previousSibling);
                }
            }
            else if (fakeNode.nextSibling) {
                if (Dom.isText(fakeNode.nextSibling)) {
                    range.setStart(fakeNode.nextSibling, 0);
                }
                else {
                    range.setStartBefore(fakeNode.nextSibling);
                }
            }
            range.collapse(true);
            this.j.s.selectRange(range);
        }
        Dom.safeRemove(fakeNode);
    }
}
backspace.requires = ['hotkeys'];
pluginSystem.add('backspace', backspace);
