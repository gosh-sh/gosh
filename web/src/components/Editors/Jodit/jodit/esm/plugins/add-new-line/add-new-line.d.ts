/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/add-new-line/README.md]]
 * @packageDocumentation
 * @module plugins/add-new-line
 */
import type { IJodit } from "../../types";
import { Plugin } from "../../modules";
import "./config";

/**
 * Create helper for adding new paragraph(Jodit.defaultOptions.enter tag) before iframe, table or image
 */
export declare class addNewLine extends Plugin {
    private __line;
    private __isMatchedTag;
    private __timeout;
    private __isBeforeContent;
    private __current;
    private __lineInFocus;
    private __isShown;
    private __show;
    private __hideForce;
    protected onLock(isLocked: true): void;
    private __hide;
    private __canGetFocus;
    protected afterInit(editor: IJodit): void;
    private __addEventListeners;
    private __onClickLine;
    protected onDblClickEditor(e: MouseEvent): void;
    private __onMouseMove;
    /** @override */
    protected beforeDestruct(): void;
}
