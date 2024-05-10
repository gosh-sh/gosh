/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import * as constants from "../../../../core/constants.js";
import { isString, loadNext } from "../../../../core/helpers/index.js";
import { SourceEditor } from "../sourceEditor.js";
export class AceEditor extends SourceEditor {
    constructor() {
        super(...arguments);
        this.className = 'jodit_ace_editor';
        /**
         * Proxy Method
         */
        this.proxyOnBlur = (e) => {
            this.j.e.fire('blur', e);
        };
        this.proxyOnFocus = (e) => {
            this.j.e.fire('focus', e);
        };
        this.proxyOnMouseDown = (e) => {
            this.j.e.fire('mousedown', e);
        };
    }
    aceExists() {
        return this.j.ow.ace !== undefined;
    }
    getLastColumnIndex(row) {
        return this.instance.session.getLine(row).length;
    }
    getLastColumnIndices() {
        const rows = this.instance.session.getLength();
        const lastColumnIndices = [];
        let lastColIndex = 0;
        for (let i = 0; i < rows; i++) {
            lastColIndex += this.getLastColumnIndex(i);
            if (i > 0) {
                lastColIndex += 1;
            }
            lastColumnIndices[i] = lastColIndex;
        }
        return lastColumnIndices;
    }
    getRowColumnIndices(characterIndex) {
        const lastColumnIndices = this.getLastColumnIndices();
        if (characterIndex <= lastColumnIndices[0]) {
            return { row: 0, column: characterIndex };
        }
        let row = 1;
        for (let i = 1; i < lastColumnIndices.length; i++) {
            if (characterIndex > lastColumnIndices[i]) {
                row = i + 1;
            }
        }
        const column = characterIndex - lastColumnIndices[row - 1] - 1;
        return { row, column };
    }
    setSelectionRangeIndices(start, end) {
        const startRowColumn = this.getRowColumnIndices(start);
        const endRowColumn = this.getRowColumnIndices(end);
        this.instance.getSelection().setSelectionRange({
            start: startRowColumn,
            end: endRowColumn
        });
    }
    getIndexByRowColumn(row, column) {
        const lastColumnIndices = this.getLastColumnIndices();
        return lastColumnIndices[row] - this.getLastColumnIndex(row) + column;
    }
    init(editor) {
        const tryInitAceEditor = () => {
            if (this.instance !== undefined || !this.aceExists()) {
                return;
            }
            const fakeMirror = this.j.c.div('jodit-source__mirror-fake');
            this.container.appendChild(fakeMirror);
            const ace = editor.ow.ace;
            this.instance = ace.edit(fakeMirror);
            this.instance.setTheme(editor.o.sourceEditorNativeOptions.theme);
            this.instance.renderer.setShowGutter(editor.o.sourceEditorNativeOptions.showGutter);
            this.instance
                .getSession()
                .setMode(editor.o.sourceEditorNativeOptions.mode);
            this.instance.setHighlightActiveLine(editor.o.sourceEditorNativeOptions.highlightActiveLine);
            this.instance.getSession().setUseWrapMode(true);
            this.instance.setOption('indentedSoftWrap', false);
            this.instance.setOption('wrap', editor.o.sourceEditorNativeOptions.wrap);
            this.instance.getSession().setUseWorker(false);
            this.instance.$blockScrolling = Infinity;
            this.instance.on('change', this.toWYSIWYG);
            this.instance.on('focus', this.proxyOnFocus);
            this.instance.on('mousedown', this.proxyOnMouseDown);
            this.instance.on('blur', this.proxyOnBlur);
            if (editor.getRealMode() !== constants.MODE_WYSIWYG) {
                this.setValue(this.getValue());
            }
            const onResize = this.j.async.debounce(() => {
                if (editor.isInDestruct) {
                    return;
                }
                if (editor.o.height !== 'auto') {
                    this.instance.setOption('maxLines', editor.workplace.offsetHeight /
                        this.instance.renderer.lineHeight);
                }
                else {
                    this.instance.setOption('maxLines', Infinity);
                }
                this.instance.resize();
            }, this.j.defaultTimeout * 2);
            editor.e.on('afterResize afterSetMode', onResize);
            onResize();
            this.onReady();
        };
        editor.e.on('afterSetMode', () => {
            if (editor.getRealMode() !== constants.MODE_SOURCE &&
                editor.getMode() !== constants.MODE_SPLIT) {
                return;
            }
            this.fromWYSIWYG();
            tryInitAceEditor();
        });
        tryInitAceEditor();
        // global add ace editor in browser
        if (!this.aceExists()) {
            loadNext(editor, editor.o.sourceEditorCDNUrlsJS)
                .then(() => {
                if (!editor.isInDestruct) {
                    tryInitAceEditor();
                }
            })
                .catch(() => null);
        }
    }
    destruct() {
        this.instance.off('change', this.toWYSIWYG);
        this.instance.off('focus', this.proxyOnFocus);
        this.instance.off('mousedown', this.proxyOnMouseDown);
        this.instance.destroy();
        this.j?.events?.off('aceInited.source');
    }
    setValue(value) {
        if (!this.j.o.editHTMLDocumentMode && this.j.o.beautifyHTML) {
            const html = this.j.e.fire('beautifyHTML', value);
            if (isString(html)) {
                value = html;
            }
        }
        this.instance.setValue(value);
        this.instance.clearSelection();
    }
    getValue() {
        return this.instance.getValue();
    }
    setReadOnly(isReadOnly) {
        this.instance.setReadOnly(isReadOnly);
    }
    get isFocused() {
        return this.instance.isFocused();
    }
    focus() {
        this.instance.focus();
    }
    blur() {
        this.instance.blur();
    }
    getSelectionStart() {
        const range = this.instance.selection.getRange();
        return this.getIndexByRowColumn(range.start.row, range.start.column);
    }
    getSelectionEnd() {
        const range = this.instance.selection.getRange();
        return this.getIndexByRowColumn(range.end.row, range.end.column);
    }
    selectAll() {
        this.instance.selection.selectAll();
    }
    insertRaw(html) {
        const start = this.instance.selection.getCursor(), end = this.instance.session.insert(start, html);
        this.instance.selection.setRange({
            start,
            end
        }, false);
    }
    setSelectionRange(start, end) {
        this.setSelectionRangeIndices(start, end);
    }
    setPlaceHolder(title) {
        // ACE does not support placeholder
        // title
    }
    replaceUndoManager() {
        const { history } = this.jodit;
        this.instance.commands.addCommand({
            name: 'Undo',
            bindKey: { win: 'Ctrl-Z', mac: 'Command-Z' },
            exec: () => {
                history.undo();
            }
        });
        this.instance.commands.addCommand({
            name: 'Redo',
            bindKey: { win: 'Ctrl-Shift-Z', mac: 'Command-Shift-Z' },
            exec: () => {
                history.redo();
            }
        });
    }
}
