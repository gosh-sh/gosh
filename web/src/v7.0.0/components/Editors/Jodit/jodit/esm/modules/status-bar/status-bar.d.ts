/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:modules/status-bar/README.md]]
 * @packageDocumentation
 * @module modules/status-bar
 */
import type { IDictionary, IJodit, IStatusBar, ModType } from "../../types";
import { ViewComponent } from "../../core/component";
import { Elms } from "../../core/traits/elms";
import { Mods } from "../../core/traits/mods";

export interface StatusBar extends Mods, Elms {
}
export declare class StatusBar extends ViewComponent<IJodit> implements IStatusBar {
    readonly target: HTMLElement;
    className(): string;
    container: HTMLDivElement;
    /**
     * Hide statusbar
     */
    hide(): void;
    /**
     * Show statusbar
     */
    show(): void;
    /**
     * Status bar is shown
     */
    get isShown(): boolean;
    readonly mods: IDictionary<ModType>;
    /**
     * Height of statusbar
     */
    getHeight(): number;
    private findEmpty;
    /**
     * Add element in statusbar
     */
    append(child: HTMLElement, inTheRight?: boolean): void;
    constructor(jodit: IJodit, target: HTMLElement);
    destruct(): void;
}
