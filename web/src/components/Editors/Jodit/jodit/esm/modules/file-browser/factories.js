/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { ContextMenu } from "../context-menu/context-menu.js";
import DataProvider from "./data-provider.js";
export function makeDataProvider(parent, options) {
    return new DataProvider(parent, options);
}
export function makeContextMenu(parent) {
    return new ContextMenu(parent);
}
