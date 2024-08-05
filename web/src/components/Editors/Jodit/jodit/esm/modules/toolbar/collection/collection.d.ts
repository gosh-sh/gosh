/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:modules/toolbar/collection/README.md]]
 * @packageDocumentation
 * @module modules/toolbar/collection
 */
import type { ButtonsGroups, IBound, IControlTypeStrong, IToolbarButton, IToolbarCollection, IUIButton, IViewBased, IViewWithToolbar, Nullable } from "../../../types";
import { UIList } from "../../../core/ui";

export declare class ToolbarCollection<T extends IViewWithToolbar = IViewWithToolbar> extends UIList<T> implements IToolbarCollection {
    /** @override */
    className(): string;
    private readonly __listenEvents;
    /**
     * First button in a list
     */
    get firstButton(): Nullable<IToolbarButton>;
    protected makeButton(control: IControlTypeStrong, target?: Nullable<HTMLElement>): IUIButton;
    protected makeSelect(control: IControlTypeStrong, target?: Nullable<HTMLElement>): IUIButton;
    /**
     * Button should be active
     */
    shouldBeActive(button: IToolbarButton): boolean | undefined;
    /**
     * The Button should be disabled
     */
    shouldBeDisabled(button: IToolbarButton): boolean | undefined;
    /**
     * Returns current target for button
     */
    getTarget(button: IToolbarButton): Node | null;
    private __immediateUpdate;
    update(): void;
    /**
     * Set direction
     */
    setDirection(direction: 'rtl' | 'ltr'): void;
    private __tooltip;
    constructor(jodit: IViewBased);
    protected __initEvents(): void;
    hide(): void;
    show(): void;
    showInline(bound?: IBound): void;
    /** @override **/
    build(items: ButtonsGroups, target?: Nullable<HTMLElement>): this;
    /** @override **/
    destruct(): void;
}
