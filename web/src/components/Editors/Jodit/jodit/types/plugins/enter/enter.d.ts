/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/enter/README.md]]
 * @packageDocumentation
 * @module plugins/enter
 */
import type { IJodit } from "../../types";
import { Plugin } from "../../core/plugin/plugin";
import "./interface";
/**
 * One of most important core plugins. It is responsible for all the browsers to have the same effect when the Enter
 * button is pressed. By default, it should insert the <p>
 */
export declare class enter extends Plugin {
    /** @override */
    protected afterInit(editor: IJodit): void;
    protected onEnterKeyDown(event: KeyboardEvent): false | void;
    private onEnter;
    private __isEmptyListLeaf;
    /** @override */
    beforeDestruct(editor: IJodit): void;
}
