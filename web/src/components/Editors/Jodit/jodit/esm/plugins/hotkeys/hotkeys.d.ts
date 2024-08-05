/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/hotkeys/README.md]]
 * @packageDocumentation
 * @module plugins/hotkeys
 */
import type { IJodit } from "../../types";
import { Plugin } from "../../core/plugin";
import "./config";
/**
 * Allow set hotkey for command or button
 */
export declare class hotkeys extends Plugin {
    private onKeyPress;
    private specialKeys;
    /** @override */
    protected afterInit(editor: IJodit): void;
    /** @override */
    protected beforeDestruct(jodit: IJodit): void;
}
