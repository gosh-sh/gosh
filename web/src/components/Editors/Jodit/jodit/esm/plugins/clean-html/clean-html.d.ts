/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/clean-html/README.md]]
 * @packageDocumentation
 * @module plugins/clean-html
 */
import type { IJodit } from "../../types";
import { Plugin } from "../../core/plugin/plugin";
import "./config";
/**
 * Clean HTML after removeFormat and insertHorizontalRule command
 */
export declare class cleanHtml extends Plugin {
    /** @override */
    buttons: Plugin['buttons'];
    /** @override */
    protected afterInit(jodit: IJodit): void;
    private get isEditMode();
    /**
     * Clean HTML code on every change
     */
    protected onChangeCleanHTML(): void;
    private currentSelectionNode;
    private walker;
    protected startWalker(): void;
    protected beforeCommand(command: string): void | false;
    /**
     * Event handler when manually assigning a value to the HTML editor.
     */
    protected onBeforeSetNativeEditorValue(data: {
        value: string;
    }): boolean;
    protected onSafeHTML(sandBox: HTMLElement): void;
    /** @override */
    protected beforeDestruct(): void;
}
