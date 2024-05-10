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
import { INVISIBLE_SPACE, KEY_ESC, MODE_SOURCE, MODE_SPLIT, SOURCE_CONSUMER } from "../../core/constants.js";
import { autobind, watch } from "../../core/decorators/index.js";
import { Dom } from "../../core/dom/dom.js";
import { pluginSystem } from "../../core/global.js";
import { isString, loadNext } from "../../core/helpers/index.js";
import { Plugin } from "../../core/plugin/index.js";
import "./config.js";
import { createSourceEditor } from "./editor/factory.js";
/**
 * Plug-in change simple textarea on CodeMirror editor in Source code mode
 */
export class source extends Plugin {
    constructor() {
        super(...arguments);
        /** @override */
        this.buttons = [
            {
                name: 'source',
                group: 'source'
            }
        ];
        this.__lock = false;
        this.__oldMirrorValue = '';
        this.tempMarkerStart = '{start-jodit-selection}';
        this.tempMarkerStartReg = /{start-jodit-selection}/g;
        this.tempMarkerEnd = '{end-jodit-selection}';
        this.tempMarkerEndReg = /{end-jodit-selection}/g;
        // override it for ace editors
        this.getSelectionStart = () => {
            return this.sourceEditor?.getSelectionStart() ?? 0;
        };
        this.getSelectionEnd = () => {
            return this.sourceEditor?.getSelectionEnd() ?? 0;
        };
    }
    onInsertHTML(html) {
        if (!this.j.o.readonly && !this.j.isEditorMode()) {
            this.sourceEditor?.insertRaw(html);
            this.toWYSIWYG();
            return false;
        }
    }
    /**
     * Update source editor from WYSIWYG area
     */
    fromWYSIWYG(force = false) {
        if (!this.__lock || force === true) {
            this.__lock = true;
            const new_value = this.j.getEditorValue(false, SOURCE_CONSUMER);
            if (new_value !== this.getMirrorValue()) {
                this.setMirrorValue(new_value);
            }
            this.__lock = false;
        }
    }
    /**
     * Update WYSIWYG area from source editor
     */
    toWYSIWYG() {
        if (this.__lock) {
            return;
        }
        const value = this.getMirrorValue();
        if (value === this.__oldMirrorValue) {
            return;
        }
        this.__lock = true;
        this.j.value = value;
        this.__lock = false;
        this.__oldMirrorValue = value;
    }
    getNormalPosition(pos, str) {
        str = str.replace(/<(script|style|iframe)[^>]*>[^]*?<\/\1>/im, m => {
            let res = '';
            for (let i = 0; i < m.length; i += 1) {
                res += INVISIBLE_SPACE;
            }
            return res;
        });
        while (pos > 0 && str[pos] === INVISIBLE_SPACE) {
            pos--;
        }
        let start = pos;
        while (start > 0) {
            start--;
            if (str[start] === '<' &&
                str[start + 1] !== undefined &&
                str[start + 1].match(/[\w/]+/i)) {
                return start;
            }
            if (str[start] === '>') {
                return pos;
            }
        }
        return pos;
    }
    clnInv(str) {
        return str.replace(consts.INVISIBLE_SPACE_REG_EXP(), '');
    }
    onSelectAll(command) {
        if (command.toLowerCase() === 'selectall' &&
            this.j.getRealMode() === MODE_SOURCE) {
            this.sourceEditor?.selectAll();
            return false;
        }
    }
    getMirrorValue() {
        return this.sourceEditor?.getValue() || '';
    }
    setMirrorValue(value) {
        this.sourceEditor?.setValue(value);
    }
    setFocusToMirror() {
        this.sourceEditor?.focus();
    }
    saveSelection() {
        if (this.j.getRealMode() === consts.MODE_WYSIWYG) {
            this.j.s.save();
            this.j.synchronizeValues();
            this.fromWYSIWYG(true);
        }
        else {
            if (this.j.o.editHTMLDocumentMode) {
                return;
            }
            const value = this.getMirrorValue();
            if (this.getSelectionStart() === this.getSelectionEnd()) {
                const marker = this.j.s.marker(true);
                const selectionStart = this.getNormalPosition(this.getSelectionStart(), this.getMirrorValue());
                this.setMirrorValue(value.substring(0, selectionStart) +
                    this.clnInv(marker.outerHTML) +
                    value.substring(selectionStart));
            }
            else {
                const markerStart = this.j.s.marker(true);
                const markerEnd = this.j.s.marker(false);
                const selectionStart = this.getNormalPosition(this.getSelectionStart(), value);
                const selectionEnd = this.getNormalPosition(this.getSelectionEnd(), value);
                this.setMirrorValue(value.slice(0, selectionStart) +
                    this.clnInv(markerStart.outerHTML) +
                    value.slice(selectionStart, selectionEnd) +
                    this.clnInv(markerEnd.outerHTML) +
                    value.slice(selectionEnd));
            }
            this.toWYSIWYG();
        }
    }
    removeSelection() {
        if (this.j.getRealMode() === consts.MODE_WYSIWYG) {
            this.__lock = true;
            this.j.s.restore();
            this.__lock = false;
            return;
        }
        let value = this.getMirrorValue();
        let selectionStart = 0, selectionEnd = 0;
        try {
            value = value
                .replace(/<span[^>]+data-jodit-selection_marker=(["'])start\1[^>]*>[<>]*?<\/span>/gim, this.tempMarkerStart)
                .replace(/<span[^>]+data-jodit-selection_marker=(["'])end\1[^>]*>[<>]*?<\/span>/gim, this.tempMarkerEnd);
            if (!this.j.o.editHTMLDocumentMode && this.j.o.beautifyHTML) {
                const html = this.j.e.fire('beautifyHTML', value);
                if (isString(html)) {
                    value = html;
                }
            }
            selectionStart = value.indexOf(this.tempMarkerStart);
            selectionEnd = selectionStart;
            value = value.replace(this.tempMarkerStartReg, '');
            if (selectionStart !== -1) {
                const selectionEndCursor = value.indexOf(this.tempMarkerEnd);
                if (selectionEndCursor !== -1) {
                    selectionEnd = selectionEndCursor;
                }
            }
            value = value.replace(this.tempMarkerEndReg, '');
        }
        finally {
            value = value
                .replace(this.tempMarkerEndReg, '')
                .replace(this.tempMarkerStartReg, '');
        }
        this.setMirrorValue(value);
        this.setMirrorSelectionRange(selectionStart, selectionEnd);
        this.toWYSIWYG();
        this.setFocusToMirror(); // need for setting focus after change mode
    }
    setMirrorSelectionRange(start, end) {
        this.sourceEditor?.setSelectionRange(start, end);
    }
    onReadonlyReact() {
        this.sourceEditor?.setReadOnly(this.j.o.readonly);
    }
    /** @override */
    afterInit(editor) {
        this.mirrorContainer = editor.c.div('jodit-source');
        editor.workplace.appendChild(this.mirrorContainer);
        editor.e.on('afterAddPlace changePlace afterInit', () => {
            editor.workplace.appendChild(this.mirrorContainer);
        });
        this.sourceEditor = createSourceEditor('area', editor, this.mirrorContainer, this.toWYSIWYG, this.fromWYSIWYG);
        editor.e.on(editor.ow, 'keydown', (e) => {
            if (e.key === KEY_ESC && this.sourceEditor?.isFocused) {
                this.sourceEditor.blur();
            }
        });
        this.onReadonlyReact();
        editor.e
            .on('placeholder.source', (text) => {
            this.sourceEditor?.setPlaceHolder(text);
        })
            .on('change.source', this.syncValueFromWYSIWYG)
            .on('beautifyHTML', html => html);
        if (editor.o.beautifyHTML) {
            const addEventListener = () => {
                if (editor.isInDestruct) {
                    return false;
                }
                const html_beautify = editor.ow.html_beautify;
                if (html_beautify && !editor.isInDestruct) {
                    editor.events
                        ?.off('beautifyHTML')
                        .on('beautifyHTML', html => html_beautify(html));
                    return true;
                }
                return false;
            };
            if (!addEventListener()) {
                loadNext(editor, editor.o.beautifyHTMLCDNUrlsJS).then(addEventListener, () => null);
            }
        }
        this.syncValueFromWYSIWYG(true);
        this.initSourceEditor(editor);
    }
    syncValueFromWYSIWYG(force = false) {
        const editor = this.j;
        if (editor.getMode() === MODE_SPLIT ||
            editor.getMode() === MODE_SOURCE) {
            this.fromWYSIWYG(force);
        }
    }
    initSourceEditor(editor) {
        if (editor.o.sourceEditor !== 'area') {
            const sourceEditor = createSourceEditor(editor.o.sourceEditor, editor, this.mirrorContainer, this.toWYSIWYG, this.fromWYSIWYG);
            sourceEditor.onReadyAlways(() => {
                this.sourceEditor?.destruct();
                this.sourceEditor = sourceEditor;
                this.syncValueFromWYSIWYG(true);
                editor.events?.fire('sourceEditorReady', editor);
            });
        }
        else {
            this.sourceEditor?.onReadyAlways(() => {
                this.syncValueFromWYSIWYG(true);
                editor.events?.fire('sourceEditorReady', editor);
            });
        }
    }
    /** @override */
    beforeDestruct() {
        if (this.sourceEditor) {
            this.sourceEditor.destruct();
            delete this.sourceEditor;
        }
        Dom.safeRemove(this.mirrorContainer);
    }
}
__decorate([
    watch(':insertHTML.source')
], source.prototype, "onInsertHTML", null);
__decorate([
    autobind
], source.prototype, "fromWYSIWYG", null);
__decorate([
    autobind
], source.prototype, "toWYSIWYG", null);
__decorate([
    autobind
], source.prototype, "getNormalPosition", null);
__decorate([
    watch(':beforeCommand.source')
], source.prototype, "onSelectAll", null);
__decorate([
    watch(':beforeSetMode.source')
], source.prototype, "saveSelection", null);
__decorate([
    watch(':afterSetMode.source')
], source.prototype, "removeSelection", null);
__decorate([
    autobind
], source.prototype, "setMirrorSelectionRange", null);
__decorate([
    watch(':readonly.source')
], source.prototype, "onReadonlyReact", null);
__decorate([
    autobind
], source.prototype, "syncValueFromWYSIWYG", null);
pluginSystem.add('source', source);
