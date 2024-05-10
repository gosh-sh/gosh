/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/line-height/README.md]]
 * @packageDocumentation
 * @module plugins/line-height
 */
import type { IJodit } from "../../types";
import { Plugin } from "../../core/plugin";
import "./config";
export declare class lineHeight extends Plugin {
    buttons: Plugin['buttons'];
    constructor(jodit: IJodit);
    protected afterInit(jodit: IJodit): void;
    private applyLineHeight;
    protected beforeDestruct(jodit: IJodit): void;
}
