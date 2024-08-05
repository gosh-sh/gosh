/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { isFunction } from "../../../core/helpers/index.js";
import { AceEditor, TextAreaEditor } from "./engines/index.js";
export function createSourceEditor(type, editor, container, toWYSIWYG, fromWYSIWYG) {
    let sourceEditor;
    if (isFunction(type)) {
        sourceEditor = type(editor);
    }
    else {
        switch (type) {
            case 'ace':
                if (!editor.o.shadowRoot) {
                    sourceEditor = new AceEditor(editor, container, toWYSIWYG, fromWYSIWYG);
                    break;
                }
            default:
                sourceEditor = new TextAreaEditor(editor, container, toWYSIWYG, fromWYSIWYG);
        }
    }
    sourceEditor.init(editor);
    sourceEditor.onReadyAlways(() => {
        sourceEditor.setReadOnly(editor.o.readonly);
    });
    return sourceEditor;
}
