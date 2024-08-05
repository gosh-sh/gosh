/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../../../core/dom/dom.js";
import { css } from "../../../../core/helpers/utils/css.js";
import { SourceEditor } from "../sourceEditor.js";
export class TextAreaEditor extends SourceEditor {
    constructor() {
        super(...arguments);
        this.autosize = this.j.async.debounce(() => {
            this.instance.style.height = 'auto';
            this.instance.style.height = this.instance.scrollHeight + 'px';
        }, this.j.defaultTimeout);
    }
    init(editor) {
        this.instance = editor.c.element('textarea', {
            class: 'jodit-source__mirror'
        });
        this.container.appendChild(this.instance);
        editor.e
            .on(this.instance, 'mousedown keydown touchstart input', editor.async.debounce(this.toWYSIWYG, editor.defaultTimeout))
            .on('setMinHeight.source', (minHeightD) => {
            css(this.instance, 'minHeight', minHeightD);
        })
            .on(this.instance, 'change keydown mousedown touchstart input', this.autosize)
            .on('afterSetMode.source', this.autosize)
            .on(this.instance, 'mousedown focus', (e) => {
            editor.e.fire(e.type, e);
        });
        this.autosize();
        this.onReady();
    }
    destruct() {
        Dom.safeRemove(this.instance);
    }
    getValue() {
        return this.instance.value;
    }
    setValue(raw) {
        this.instance.value = raw;
    }
    insertRaw(raw) {
        const value = this.getValue();
        if (this.getSelectionStart() >= 0) {
            const startPos = this.getSelectionStart(), endPos = this.getSelectionEnd();
            this.setValue(value.substring(0, startPos) +
                raw +
                value.substring(endPos, value.length));
        }
        else {
            this.setValue(value + raw);
        }
    }
    getSelectionStart() {
        return this.instance.selectionStart;
    }
    getSelectionEnd() {
        return this.instance.selectionEnd;
    }
    setSelectionRange(start, end = start) {
        this.instance.setSelectionRange(start, end);
    }
    get isFocused() {
        return this.instance === this.j.od.activeElement;
    }
    focus() {
        this.instance.focus();
    }
    blur() {
        this.instance.blur();
    }
    setPlaceHolder(title) {
        this.instance.setAttribute('placeholder', title);
    }
    setReadOnly(isReadOnly) {
        if (isReadOnly) {
            this.instance.setAttribute('readonly', 'true');
        }
        else {
            this.instance.removeAttribute('readonly');
        }
    }
    selectAll() {
        this.instance.select();
    }
    replaceUndoManager() {
        const { history } = this.jodit;
        this.j.e.on(this.instance, 'keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                if (e.shiftKey) {
                    history.redo();
                }
                else {
                    history.undo();
                }
                this.setSelectionRange(this.getValue().length);
                return false;
            }
        });
    }
}
