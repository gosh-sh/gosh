/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { IS_PROD } from "../../constants.js";
import { getContainer } from "../../global.js";
import { isInitable } from "../../helpers/checker/index.js";
import { loadStyle } from "./load.js";
/**
 * Init plugin if it has no dependencies, in another case wait requires plugins will be init
 * @private
 */
export function init(jodit, pluginName, plugin, instance, doneList, waitingList) {
    if (isInitable(instance)) {
        try {
            instance.init(jodit);
        }
        catch (e) {
            console.error(e);
            if (!IS_PROD) {
                throw e;
            }
        }
    }
    doneList.set(pluginName, instance);
    waitingList.delete(pluginName);
    if (instance.hasStyle) {
        loadStyle(jodit, pluginName).catch(e => {
            !IS_PROD && console.error(e);
        });
    }
    if (instance.styles) {
        const style = getContainer(jodit, pluginName, 'style');
        style.innerHTML = instance.styles;
    }
}
