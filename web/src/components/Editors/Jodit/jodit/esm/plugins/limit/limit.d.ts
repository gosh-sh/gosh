/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/limit/README.md]]
 * @packageDocumentation
 * @module plugins/limit
 */
import type { IJodit } from "../../types";
import { Plugin } from "../../core/plugin";
import "./config";
/**
 * Plugin control for chars or words count
 */
export declare class limit extends Plugin {
    /** @override **/
    protected afterInit(jodit: IJodit): void;
    /**
     * Action should be prevented
     */
    private shouldPreventInsertHTML;
    private __shouldDenyInput;
    /**
     * Check if some keypress or paste should be prevented
     */
    private checkPreventKeyPressOrPaste;
    /**
     * Check if some external changing should be prevented
     */
    private checkPreventChanging;
    /**
     * Split text on words without technical characters
     */
    private __splitWords;
    /** @override **/
    protected beforeDestruct(jodit: IJodit): void;
}
