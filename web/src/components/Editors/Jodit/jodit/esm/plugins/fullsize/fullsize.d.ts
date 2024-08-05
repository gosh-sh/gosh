/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/fullsize/README.md]]
 * @packageDocumentation
 * @module plugins/fullsize
 */
import type { IViewWithToolbar } from "../../types";
import "./config";

/**
 * Process `toggleFullSize` event, and behavior - set/unset fullsize mode
 */
export declare function fullsize(editor: IViewWithToolbar): void;
