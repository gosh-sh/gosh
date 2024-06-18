/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module helpers/normalize
 */
/**
 * Normalize value to CSS meters
 */
export const normalizeSize = (value, units) => {
    if (/^[0-9]+$/.test(value.toString())) {
        return value + units;
    }
    return value.toString();
};
