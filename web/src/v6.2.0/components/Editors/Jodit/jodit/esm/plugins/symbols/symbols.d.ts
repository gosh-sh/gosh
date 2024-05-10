/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/symbols/README.md]]
 * @packageDocumentation
 * @module plugins/symbols
 */
import type { IJodit } from "../../types";
import { Plugin } from "../../core/plugin/plugin";
import "./config";

/**
 * The plugin inserts characters that are not part of the standard keyboard.
 */
export declare class symbols extends Plugin {
    /** @override */
    buttons: Plugin['buttons'];
    private countInRow;
    constructor(jodit: IJodit);
    /** @override */
    afterInit(jodit: IJodit): void;
    /** @override */
    protected beforeDestruct(jodit: IJodit): void;
}
