/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/link/README.md]]
 * @packageDocumentation
 * @module plugins/link
 */
import type { IJodit } from "../../types";
import { Plugin } from "../../core/plugin";
import "./config";
/**
 * Process link. Insert, dblclick or remove format
 */
export declare class link extends Plugin {
    /** @override */
    buttons: Plugin['buttons'];
    /** @override */
    protected afterInit(jodit: IJodit): void;
    private onDblClickOnLink;
    private onProcessPasteLink;
    private __generateForm;
    /** @override */
    protected beforeDestruct(jodit: IJodit): void;
}
