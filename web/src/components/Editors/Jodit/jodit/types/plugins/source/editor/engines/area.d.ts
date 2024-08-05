/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/source
 */
import type { IJodit, ISourceEditor } from "../../../../types";
import { SourceEditor } from "../sourceEditor";
export declare class TextAreaEditor extends SourceEditor<HTMLTextAreaElement> implements ISourceEditor {
    private autosize;
    init(editor: IJodit): any;
    destruct(): any;
    getValue(): string;
    setValue(raw: string): void;
    insertRaw(raw: string): void;
    getSelectionStart(): number;
    getSelectionEnd(): number;
    setSelectionRange(start: number, end?: number): void;
    get isFocused(): boolean;
    focus(): void;
    blur(): void;
    setPlaceHolder(title: string): void;
    setReadOnly(isReadOnly: boolean): void;
    selectAll(): void;
    replaceUndoManager(): void;
}
