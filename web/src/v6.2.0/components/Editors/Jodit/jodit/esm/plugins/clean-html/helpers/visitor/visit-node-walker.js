/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { IS_PROD } from "../../../../core/constants.js";
import * as filters from "./filters/index.js";
const keys = Object.keys(filters);
/**
 * @private
 */
export function visitNodeWalker(jodit, nodeElm, allowTags, denyTags, currentSelectionNode) {
    let hadEffect = false;
    const dcf = jodit.o.cleanHTML.disableCleanFilter;
    for (const key of keys) {
        if (dcf && dcf.has(key)) {
            continue;
        }
        const filter = filters[key];
        const tmp = hadEffect;
        hadEffect = filter(jodit, nodeElm, hadEffect, allowTags, denyTags, currentSelectionNode);
        if (!IS_PROD && !tmp && hadEffect) {
            console.warn(`CleanHTML: Effect "${key}"`);
        }
        if (!nodeElm.isConnected) {
            return true;
        }
    }
    return hadEffect;
}
