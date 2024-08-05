/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/key-arrow-outside/README.md]]
 * @packageDocumentation
 * @module plugins/key-arrow-outside
 */
import type { IJodit } from "../../types";
import { Plugin } from "../../core/plugin";
/**
 * Allowing to go outside of an inline element if there is no other element after that.
 */
export declare class keyArrowOutside extends Plugin {
    protected afterInit(jodit: IJodit): void;
    protected beforeDestruct(jodit: IJodit): void;
    protected onKeyDownArrow(e: KeyboardEvent): void;
}
