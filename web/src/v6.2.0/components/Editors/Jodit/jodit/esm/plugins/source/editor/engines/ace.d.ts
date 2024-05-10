/// <reference types="ace" />
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
export declare class AceEditor extends SourceEditor<AceAjax.Editor> implements ISourceEditor {
    className: string;
    private aceExists;
    /**
     * Proxy Method
     */
    private proxyOnBlur;
    private proxyOnFocus;
    private proxyOnMouseDown;
    private getLastColumnIndex;
    private getLastColumnIndices;
    private getRowColumnIndices;
    private setSelectionRangeIndices;
    private getIndexByRowColumn;
    init(editor: IJodit): any;
    destruct(): any;
    setValue(value: string): void;
    getValue(): string;
    setReadOnly(isReadOnly: boolean): void;
    get isFocused(): boolean;
    focus(): void;
    blur(): void;
    getSelectionStart(): number;
    getSelectionEnd(): number;
    selectAll(): void;
    insertRaw(html: string): void;
    setSelectionRange(start: number, end: number): void;
    setPlaceHolder(title: string): void;
    replaceUndoManager(): void;
}
