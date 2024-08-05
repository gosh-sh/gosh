/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/enter
 */
import type { IJodit } from "../../../types";
/**
 * If there is no container outside,
 * then we wrap all the nearest inline nodes in a container
 * @private
 */
export declare function wrapText(fake: Text, jodit: IJodit): HTMLElement;
