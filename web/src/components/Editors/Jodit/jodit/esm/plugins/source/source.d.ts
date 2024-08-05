/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/source/README.md]]
 * @packageDocumentation
 * @module plugins/source
 */
import type { IJodit, ISourceEditor } from "../../types";
import { Plugin } from "../../core/plugin";
import "./config";

/**
 * Plug-in change simple textarea on CodeMirror editor in Source code mode
 */
export declare class source extends Plugin {
    /** @override */
    buttons: Plugin['buttons'];
    sourceEditor?: ISourceEditor;
    private mirrorContainer;
    private __lock;
    private __oldMirrorValue;
    private tempMarkerStart;
    private tempMarkerStartReg;
    private tempMarkerEnd;
    private tempMarkerEndReg;
    protected onInsertHTML(html: string): void | false;
    /**
     * Update source editor from WYSIWYG area
     */
    private fromWYSIWYG;
    /**
     * Update WYSIWYG area from source editor
     */
    private toWYSIWYG;
    private getNormalPosition;
    private clnInv;
    protected onSelectAll(command: string): void | false;
    private getSelectionStart;
    private getSelectionEnd;
    private getMirrorValue;
    private setMirrorValue;
    private setFocusToMirror;
    protected saveSelection(): void;
    protected removeSelection(): void;
    private setMirrorSelectionRange;
    private onReadonlyReact;
    /** @override */
    afterInit(editor: IJodit): void;
    private syncValueFromWYSIWYG;
    private initSourceEditor;
    /** @override */
    beforeDestruct(): void;
}
