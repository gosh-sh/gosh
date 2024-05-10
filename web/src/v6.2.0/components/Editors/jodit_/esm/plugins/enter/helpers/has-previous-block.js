/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../../core/dom/dom.js";
/**
 * @private
 */
export function hasPreviousBlock(fake, jodit) {
    return Boolean(Dom.prev(fake, elm => Dom.isBlock(elm) || Dom.isImage(elm), jodit.editor));
}
