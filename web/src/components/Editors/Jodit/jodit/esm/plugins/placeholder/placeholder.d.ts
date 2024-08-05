/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/placeholder/README.md]]
 * @packageDocumentation
 * @module plugins/placeholder
 */
import type { IJodit } from "../../types";
import { Plugin } from "../../core/plugin/plugin";
import "./config";

/**
 * Check if root node is empty
 * @private
 */
export declare function isEditorEmpty(root: HTMLElement): boolean;
/**
 * Show placeholder inside empty editor
 */
export declare class placeholder extends Plugin {
    private placeholderElm;
    protected afterInit(editor: IJodit): void;
    private addNativeListeners;
    private addEvents;
    private show;
    private hide;
    private toggle;
    protected beforeDestruct(jodit: IJodit): void;
}
