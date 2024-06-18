/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/backspace
 */
import { checkJoinNeighbors } from "./check-join-neighbors.js";
import { checkJoinTwoLists } from "./check-join-two-lists.js";
import { checkRemoveChar } from "./check-remove-char.js";
import { checkRemoveContentNotEditable } from "./check-remove-content-not-editable.js";
import { checkRemoveEmptyNeighbor } from "./check-remove-empty-neighbor.js";
import { checkRemoveEmptyParent } from "./check-remove-empty-parent.js";
import { checkRemoveUnbreakableElement } from "./check-remove-unbreakable-element.js";
import { checkTableCell } from "./check-table-cell.js";
import { checkUnwrapFirstListItem } from "./check-unwrap-first-list-item.js";
/**
 * @private
 */
export const cases = [
    checkRemoveUnbreakableElement,
    checkRemoveContentNotEditable,
    checkRemoveChar,
    checkTableCell,
    checkRemoveEmptyParent,
    checkRemoveEmptyNeighbor,
    checkJoinTwoLists,
    checkJoinNeighbors,
    checkUnwrapFirstListItem
];
