/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { IS_PROD } from "../../constants.js";
import { isFunction } from "../../helpers/checker/is-function.js";
/**
 * Create instance of plugin
 * @private
 */
export function makeInstance(jodit, plugin) {
    try {
        try {
            // @ts-ignore
            return isFunction(plugin) ? new plugin(jodit) : plugin;
        }
        catch (e) {
            if (isFunction(plugin) && !plugin.prototype) {
                return plugin(jodit);
            }
        }
    }
    catch (e) {
        console.error(e);
        if (!IS_PROD) {
            throw e;
        }
    }
    return null;
}
