/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/paste
 */
import type { IDialog, IJodit, InsertMode, IUIOption, Nullable } from "../../types";
import type { PasteEvent } from "./interface";
/**
 * One insert point for clipboard plugins
 * @private
 */
export declare function pasteInsertHtml(e: Nullable<PasteEvent>, editor: IJodit, html: number | string | Node): void;
/**
 * Return all available data types in event
 * @private
 */
export declare function getAllTypes(dt: DataTransfer): string;
/**
 * Make command dialog
 * @private
 */
export declare function askInsertTypeDialog(jodit: IJodit, msg: string, title: string, callback: (yes: InsertMode) => void, buttonList: IUIOption[]): IDialog | void;
