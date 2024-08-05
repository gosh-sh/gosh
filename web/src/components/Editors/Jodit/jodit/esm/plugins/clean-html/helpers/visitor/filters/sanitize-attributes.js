/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../../../../core/dom/dom.js";
import { sanitizeHTMLElement } from "../../../../../core/helpers/index.js";
/**
 * @private
 */
export function sanitizeAttributes(jodit, nodeElm, hadEffect) {
    if (Dom.isElement(nodeElm) &&
        sanitizeHTMLElement(nodeElm, {
            safeJavaScriptLink: jodit.options.cleanHTML.safeJavaScriptLink,
            removeOnError: jodit.options.cleanHTML.removeOnError
        })) {
        return true;
    }
    return hadEffect;
}
