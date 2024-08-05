/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/sticky/README.md]]
 * @packageDocumentation
 * @module plugins/sticky
 */
import type { IJodit } from "../../types";
import { Plugin } from "../../core/plugin/plugin";
import "./config";

export declare class sticky extends Plugin {
    private __isToolbarStuck;
    private __dummyBox?;
    private __createDummy;
    /**
     * Add sticky
     */
    addSticky: (toolbar: HTMLElement) => void;
    /**
     * Remove sticky behaviour
     */
    removeSticky: (toolbar: HTMLElement) => void;
    afterInit(jodit: IJodit): void;
    /**
     * Scroll handler
     */
    private __onScroll;
    /**
     * Is mobile device
     */
    private __isMobile;
    beforeDestruct(jodit: IJodit): void;
}
