/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/size/README.md]]
 * @packageDocumentation
 * @module plugins/size
 */
import type { IJodit } from "../../types";
import { Plugin } from "../../core/plugin/plugin";
import "./config";

/**
 * Calculate sizes for editor workspace and handle setHeight and setWidth events
 */
export declare class size extends Plugin {
    protected afterInit(editor: IJodit): void;
    /**
     * Set editor size by options
     */
    private __initialize;
    /**
     * Manually change height
     */
    private __setHeight;
    /**
     * Manually change width
     */
    private __setWidth;
    /**
     * Returns service spaces: toolbar + statusbar
     */
    private __getNotWorkHeight;
    /**
     * Calculate workspace height
     */
    private __resizeWorkspaceImd;
    /**
     * Debounced wrapper for resizeWorkspaceImd
     */
    private __resizeWorkspaces;
    /** @override **/
    protected beforeDestruct(jodit: IJodit): void;
}
