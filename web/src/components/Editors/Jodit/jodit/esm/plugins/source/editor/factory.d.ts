/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/source
 */
import type { CallbackFunction, IJodit, ISourceEditor } from "../../../types";
export declare function createSourceEditor(type: 'ace' | 'mirror' | 'area' | ((jodit: IJodit) => ISourceEditor), editor: IJodit, container: HTMLElement, toWYSIWYG: CallbackFunction, fromWYSIWYG: CallbackFunction): ISourceEditor;
