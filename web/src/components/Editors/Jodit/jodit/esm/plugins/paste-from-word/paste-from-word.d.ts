/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/paste-from-word/README.md]]
 * @packageDocumentation
 * @module plugins/paste-from-word
 */
import type { IJodit, InsertMode } from "../../types";
import type { PastedData, PasteEvent } from "../paste/interface";
import { Plugin } from "../../core/plugin";
import "./config";
export declare class pasteFromWord extends Plugin {
    static requires: string[];
    protected afterInit(jodit: IJodit): void;
    protected beforeDestruct(jodit: IJodit): void;
    /**
     * Try if text is Word's document fragment and try process this
     */
    protected processWordHTML(e: PasteEvent, text: string, texts: PastedData): boolean;
    /**
     * Clear extra styles and tags from Word's pasted text
     */
    protected insertFromWordByType(e: PasteEvent, html: string, insertType: InsertMode, texts: PastedData): void;
}
