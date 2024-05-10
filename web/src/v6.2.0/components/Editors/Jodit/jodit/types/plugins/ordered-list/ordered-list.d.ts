/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/ordered-list/README.md]]
 * @packageDocumentation
 * @module plugins/ordered-list
 */
import type { IJodit } from "../../types";
import { Plugin } from "../../core/plugin";
import "./config";
/**
 * Process commands insertOrderedList and insertUnOrderedList
 */
export declare class orderedList extends Plugin {
    buttons: Plugin['buttons'];
    protected afterInit(jodit: IJodit): void;
    private onCommand;
    protected beforeDestruct(jodit: IJodit): void;
}
