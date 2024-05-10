/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugin
 */
import type { IJodit, IPluginSystem, PluginType } from "../../types";
import "./interface";
/**
 * Jodit plugin system
 * @example
 * ```js
 * Jodit.plugins.add('emoji2', {
 * 	init() {
 *  	alert('emoji Inited2')
 * 	},
 *	destruct() {}
 * });
 * ```
 */
export declare class PluginSystem implements IPluginSystem {
    private __items;
    /**
     * Add plugin in store
     */
    add(name: string, plugin: PluginType): void;
    /**
     * Get plugin from store
     */
    get(name: string): PluginType | void;
    /**
     * Remove plugin from store
     */
    remove(name: string): void;
    private __getFullPluginsList;
    /**
     * Public method for async init all plugins
     */
    __init(jodit: IJodit): void;
    /**
     * Returns the promise to wait for the plugin to load.
     */
    wait(name: string): Promise<void>;
}
