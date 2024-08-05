/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/spellcheck/README.md]]
 * @packageDocumentation
 * @module plugins/spellcheck
 */
import type { IJodit } from "../../types";
import { Plugin } from "../../core/plugin";
import "./config";
export declare class spellcheck extends Plugin {
    buttons: Plugin['buttons'];
    constructor(jodit: IJodit);
    protected afterInit(jodit: IJodit): void;
    private toggleSpellcheck;
    protected beforeDestruct(jodit: IJodit): void;
}
