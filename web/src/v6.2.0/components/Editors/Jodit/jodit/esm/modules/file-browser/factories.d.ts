/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module modules/file-browser
 */
import type { IContextMenu, IFileBrowserDataProvider, IFileBrowserOptions, IUIElement, IViewBased } from "../../types";
export declare function makeDataProvider(parent: IViewBased, options: IFileBrowserOptions): IFileBrowserDataProvider;
export declare function makeContextMenu(parent: IViewBased): IContextMenu & IUIElement;
