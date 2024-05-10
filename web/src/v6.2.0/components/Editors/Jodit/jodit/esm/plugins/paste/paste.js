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
import { CLIPBOARD_ID, INSERT_AS_TEXT, INSERT_CLEAR_HTML, INSERT_ONLY_TEXT, TEXT_HTML, TEXT_PLAIN, TEXT_RTF } from "../../core/constants.js";
import { autobind } from "../../core/decorators/index.js";
import { Dom } from "../../core/dom/dom.js";
import { pluginSystem } from "../../core/global.js";
import { cleanFromWord, getDataTransfer, htmlspecialchars, isHTML, isString, LimitedStack, nl2br, stripTags, trim } from "../../core/helpers/index.js";
import { Plugin } from "../../core/plugin/plugin.js";
import "./config.js";
import { askInsertTypeDialog, getAllTypes, pasteInsertHtml } from "./helpers.js";
/**
 * Ask before paste HTML source
 */
export class paste extends Plugin {
    constructor() {
        super(...arguments);
        this.pasteStack = new LimitedStack(20);
        /**
         * The dialog box was already open
         */
        this._isDialogOpened = false;
    }
    /** @override **/
    afterInit(jodit) {
        jodit.e
            .on('paste.paste', this.onPaste)
            .on('pasteStack.paste', (item) => this.pasteStack.push(item));
        if (jodit.o.nl2brInPlainText) {
            this.j.e.on('processPaste.paste', this.onProcessPasteReplaceNl2Br);
        }
    }
    /** @override **/
    beforeDestruct(jodit) {
        jodit.e
            .off('paste.paste', this.onPaste)
            .off('processPaste.paste', this.onProcessPasteReplaceNl2Br)
            .off('.paste');
    }
    /**
     * Paste event handler
     */
    onPaste(e) {
        try {
            if (this.customPasteProcess(e) === false ||
                this.j.e.fire('beforePaste', e) === false) {
                e.preventDefault();
                return false;
            }
            this.defaultPasteProcess(e);
        }
        finally {
            this.j.e.fire('afterPaste', e);
        }
    }
    /**
     * Process before paste
     */
    customPasteProcess(e) {
        if (!this.j.o.processPasteHTML) {
            return;
        }
        const dt = getDataTransfer(e), texts = [
            dt?.getData(TEXT_PLAIN),
            dt?.getData(TEXT_HTML),
            dt?.getData(TEXT_RTF)
        ];
        for (const value of texts) {
            if (isHTML(value) &&
                (this.j.e.fire('processHTML', e, value, {
                    plain: texts[0],
                    html: texts[1],
                    rtf: texts[2]
                }) ||
                    this.processHTML(e, value))) {
                return false;
            }
        }
    }
    /**
     * Default paster process
     */
    defaultPasteProcess(e) {
        const dt = getDataTransfer(e);
        let text = dt?.getData(TEXT_HTML) || dt?.getData(TEXT_PLAIN);
        if (dt && text && trim(text) !== '') {
            const result = this.j.e.fire('processPaste', e, text, getAllTypes(dt));
            if (result !== undefined) {
                text = result;
            }
            if (isString(text) || Dom.isNode(text)) {
                this.__insertByType(e, text, this.j.o.defaultActionOnPaste);
            }
            e.preventDefault();
            e.stopPropagation();
        }
    }
    /**
     * Process usual HTML text fragment
     */
    processHTML(e, html) {
        if (!this.j.o.askBeforePasteHTML) {
            return false;
        }
        if (this.j.o.memorizeChoiceWhenPasteFragment) {
            const cached = this.pasteStack.find(cachedItem => cachedItem.html === html);
            if (cached) {
                this.__insertByType(e, html, cached.action || this.j.o.defaultActionOnPaste);
                return true;
            }
        }
        if (this._isDialogOpened) {
            return true;
        }
        const dialog = askInsertTypeDialog(this.j, 'Your code is similar to HTML. Keep as HTML?', 'Paste as HTML', insertType => {
            this._isDialogOpened = false;
            this.__insertByType(e, html, insertType);
        }, this.j.o.pasteHTMLActionList);
        if (dialog) {
            this._isDialogOpened = true;
            dialog.e.on('beforeClose', () => {
                this._isDialogOpened = false;
            });
        }
        return true;
    }
    /**
     * Insert HTML by option type
     */
    __insertByType(e, html, action) {
        this.pasteStack.push({ html, action });
        if (isString(html)) {
            this.j.buffer.set(CLIPBOARD_ID, html);
            switch (action) {
                case INSERT_CLEAR_HTML:
                    html = cleanFromWord(html);
                    break;
                case INSERT_ONLY_TEXT:
                    html = stripTags(html, this.j.ed, new Set(this.j.o.pasteExcludeStripTags));
                    break;
                case INSERT_AS_TEXT:
                    html = htmlspecialchars(html);
                    break;
                default:
            }
        }
        pasteInsertHtml(e, this.j, html);
    }
    /**
     * Replace all \\n chars in plain text to br
     */
    onProcessPasteReplaceNl2Br(ignore, text, type) {
        if (type === TEXT_PLAIN + ';' && !isHTML(text)) {
            return nl2br(text);
        }
    }
}
__decorate([
    autobind
], paste.prototype, "onPaste", null);
__decorate([
    autobind
], paste.prototype, "onProcessPasteReplaceNl2Br", null);
pluginSystem.add('paste', paste);
