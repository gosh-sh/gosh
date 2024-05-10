/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { isArray } from "../../helpers/checker/is-array.js";
/**
 * @private
 */
export const isButtonGroup = (item) => {
    return isArray(item.buttons);
};
/**
 * @private
 */
export function flatButtonsSet(buttons, jodit) {
    const groups = jodit.getRegisteredButtonGroups();
    return new Set(buttons.reduce((acc, item) => {
        if (isButtonGroup(item)) {
            acc = acc.concat([
                ...item.buttons,
                ...(groups[item.group] ?? [])
            ]);
        }
        else {
            acc.push(item);
        }
        return acc;
    }, []));
}
