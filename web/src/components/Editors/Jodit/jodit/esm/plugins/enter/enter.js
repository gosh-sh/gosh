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
import { BR, KEY_ENTER, PARAGRAPH } from "../../core/constants.js";
import { watch } from "../../core/decorators/index.js";
import { Dom } from "../../core/dom/dom.js";
import { pluginSystem } from "../../core/global.js";
import { isBoolean } from "../../core/helpers/checker/is-boolean.js";
import { Plugin } from "../../core/plugin/plugin.js";
import "./interface.js";
import { checkBR, checkUnsplittableBox, getBlockWrapper, hasPreviousBlock, insertParagraph, moveCursorOutFromSpecialTags, processEmptyLILeaf, splitFragment, wrapText } from "./helpers/index.js";
/**
 * One of most important core plugins. It is responsible for all the browsers to have the same effect when the Enter
 * button is pressed. By default, it should insert the <p>
 */
export class enter extends Plugin {
    /** @override */
    afterInit(editor) {
        // use 'enter' option if no set
        const defaultTag = editor.o.enter.toLowerCase();
        const brMode = defaultTag === BR.toLowerCase();
        if (!editor.o.enterBlock) {
            editor.o.enterBlock = brMode
                ? PARAGRAPH
                : defaultTag;
        }
        editor.registerCommand('enter', (command, value, event = {}) => this.onEnter(event));
    }
    onEnterKeyDown(event) {
        if (event.key === KEY_ENTER) {
            const editor = this.j;
            const beforeEnter = editor.e.fire('beforeEnter', event);
            if (beforeEnter !== undefined) {
                return beforeEnter;
            }
            if (!editor.s.isCollapsed()) {
                editor.execCommand('Delete');
            }
            editor.s.focus();
            this.onEnter(event);
            editor.e.fire('afterEnter', event);
            editor.synchronizeValues(); // fire change
            return false;
        }
    }
    onEnter(event) {
        const { jodit } = this;
        const fake = jodit.createInside.fake();
        try {
            Dom.safeInsertNode(jodit.s.range, fake);
            moveCursorOutFromSpecialTags(jodit, fake, ['a']);
            let block = getBlockWrapper(fake, jodit);
            const isLi = Dom.isLeaf(block);
            // if use <br> defaultTag for break line or when was entered SHIFt key or in <td> or <th> or <blockquote>
            if ((!isLi || event?.shiftKey) &&
                checkBR(fake, jodit, event?.shiftKey)) {
                return false;
            }
            // wrap no wrapped element
            if (!block && !hasPreviousBlock(fake, jodit)) {
                block = wrapText(fake, jodit);
            }
            if (!block) {
                insertParagraph(fake, jodit, isLi ? 'li' : jodit.o.enter);
                return false;
            }
            if (!checkUnsplittableBox(fake, jodit, block)) {
                return false;
            }
            if (isLi && this.__isEmptyListLeaf(block)) {
                processEmptyLILeaf(fake, jodit, block);
                return false;
            }
            splitFragment(fake, jodit, block);
        }
        finally {
            fake.isConnected && jodit.s.setCursorBefore(fake);
            Dom.safeRemove(fake);
        }
    }
    __isEmptyListLeaf(li) {
        const result = this.j.e.fire('enterIsEmptyListLeaf', li);
        return isBoolean(result) ? result : Dom.isEmpty(li);
    }
    /** @override */
    beforeDestruct(editor) {
        editor.e.off('keydown.enter');
    }
}
__decorate([
    watch(':keydown.enter')
], enter.prototype, "onEnterKeyDown", null);
pluginSystem.add('enter', enter);
