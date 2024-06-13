/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { MARKER_CLASS } from "../../constants.js";
import { Dom } from "../../dom/dom.js";
/**
 * Define element is selection helper
 */
export function isMarker(elm) {
    return (Dom.isNode(elm) &&
        Dom.isTag(elm, 'span') &&
        elm.hasAttribute('data-' + MARKER_CLASS));
}
