/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/redo-undo/README.md]]
 * @packageDocumentation
 * @module plugins/redo-undo
 */
import type { IJodit, IPlugin } from "../../types";
import { Plugin } from "../../core/plugin/plugin";
/**
 * Custom process Redo and Undo functionality
 */
export declare class redoUndo extends Plugin {
    /** @override */
    buttons: IPlugin['buttons'];
    protected beforeDestruct(): void;
    protected afterInit(editor: IJodit): void;
}
