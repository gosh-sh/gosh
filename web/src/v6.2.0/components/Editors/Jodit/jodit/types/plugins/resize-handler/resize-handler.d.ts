/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/resize-handler/README.md]]
 * @packageDocumentation
 * @module plugins/resize-handler
 */
import type { IJodit } from "../../types";
import { Plugin } from "../../core/plugin";
import "./config";
export declare class resizeHandler extends Plugin {
    /** @override **/
    static requires: string[];
    /** @override **/
    protected afterInit(editor: IJodit): void;
    /**
     * Plugin in resize process
     */
    private isResized;
    /**
     * Start point
     */
    private start;
    /**
     * Handler: Click on handle - start resizing
     */
    private onHandleResizeStart;
    /**
     * Handler: Mouse move after start resizing
     */
    private onHandleResize;
    /**
     * End of resizing
     */
    private onHandleResizeEnd;
    /**
     * Resize handle
     */
    private handle;
    /** @override **/
    protected beforeDestruct(): void;
}
