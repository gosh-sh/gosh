/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/clipboard/README.md]]
 * @packageDocumentation
 * @module plugins/clipboard
 */
import type { IJodit, IPlugin } from "../../types";
import type { Plugin } from "../../core/plugin";
import "./config";
/**
 * Clipboard plugin - cut and copy functionality
 */
export declare class clipboard implements IPlugin {
    jodit: IJodit;
    /** @override */
    buttons: Plugin['buttons'];
    init(editor: IJodit): void;
    /** @override */
    destruct(editor: IJodit): void;
}
