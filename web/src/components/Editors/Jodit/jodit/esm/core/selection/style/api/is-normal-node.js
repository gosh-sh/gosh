/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../../dom/dom.js";
import { isMarker } from "../../../helpers/checker/is-marker.js";
/**
 * Is normal usual element
 * @private
 */
export function isNormalNode(elm) {
    return Boolean(elm &&
        !Dom.isEmptyTextNode(elm) &&
        !Dom.isTemporary(elm) &&
        !isMarker(elm));
}
