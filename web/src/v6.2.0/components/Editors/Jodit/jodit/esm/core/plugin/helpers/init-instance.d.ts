/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugin
 */
import type { IJodit, Nullable, PluginInstance, PluginType } from "../../../types";
/**
 * Init plugin if it has no dependencies, in another case wait requires plugins will be init
 * @private
 */
export declare function init(jodit: IJodit, pluginName: string, plugin: PluginType, instance: PluginInstance, doneList: Map<string, Nullable<PluginInstance>>, waitingList: Set<string>): void;
