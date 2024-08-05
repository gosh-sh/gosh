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
import { INSERT_AS_HTML, INSERT_AS_TEXT, INSERT_ONLY_TEXT } from "../../core/constants.js";
import { watch } from "../../core/decorators/index.js";
import { pluginSystem } from "../../core/global.js";
import { applyStyles, cleanFromWord, isHtmlFromWord, isString, stripTags } from "../../core/helpers/index.js";
import { Plugin } from "../../core/plugin/index.js";
import "./config.js";
import { askInsertTypeDialog, pasteInsertHtml } from "../paste/helpers.js";
export class pasteFromWord extends Plugin {
    afterInit(jodit) { }
    beforeDestruct(jodit) { }
    /**
     * Try if text is Word's document fragment and try process this
     */
    processWordHTML(e, text, texts) {
        const { j } = this, { processPasteFromWord, askBeforePasteFromWord, defaultActionOnPasteFromWord, defaultActionOnPaste, pasteFromWordActionList } = j.o;
        if (processPasteFromWord && isHtmlFromWord(text)) {
            if (askBeforePasteFromWord) {
                askInsertTypeDialog(j, 'The pasted content is coming from a Microsoft Word/Excel document. ' +
                    'Do you want to keep the format or clean it up?', 'Word Paste Detected', insertType => {
                    this.insertFromWordByType(e, text, insertType, texts);
                }, pasteFromWordActionList);
            }
            else {
                this.insertFromWordByType(e, text, defaultActionOnPasteFromWord || defaultActionOnPaste, texts);
            }
            return true;
        }
        return false;
    }
    /**
     * Clear extra styles and tags from Word's pasted text
     */
    insertFromWordByType(e, html, insertType, texts) {
        switch (insertType) {
            case INSERT_AS_HTML: {
                html = applyStyles(html);
                const value = this.j.events?.fire('beautifyHTML', html);
                if (isString(value)) {
                    html = value;
                }
                break;
            }
            case INSERT_AS_TEXT: {
                html = cleanFromWord(html);
                break;
            }
            case INSERT_ONLY_TEXT: {
                html = stripTags(cleanFromWord(html));
                break;
            }
        }
        pasteInsertHtml(e, this.j, html);
    }
}
pasteFromWord.requires = ['paste'];
__decorate([
    watch(':processHTML')
], pasteFromWord.prototype, "processWordHTML", null);
pluginSystem.add('pasteFromWord', pasteFromWord);
