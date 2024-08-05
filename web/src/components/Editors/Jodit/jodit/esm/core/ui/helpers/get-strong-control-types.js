/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { isArray } from "../../helpers/checker/is-array.js";
import { ConfigProto, keys } from "../../helpers/utils/index.js";
import { getControlType } from "./get-control-type.js";
import { Config } from "../../../config.js";
/**
 * @private
 */
export function getStrongControlTypes(items, controls) {
    const elements = isArray(items)
        ? items
        : keys(items, false).map(key => {
            const value = items[key] || {};
            return ConfigProto({ name: key }, value);
        });
    return elements.map(item => getControlType(item, controls || Config.defaultOptions.controls));
}
