/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module ui
 */
import type { ButtonsGroup, ButtonsGroups, IControlType, IJodit } from "../../../types";
/**
 * @private
 */
export declare const isButtonGroup: (item: ButtonsGroup | string | IControlType) => item is ButtonsGroup;
/**
 * @private
 */
export declare function flatButtonsSet(buttons: ButtonsGroups, jodit: IJodit): Set<string | IControlType>;
