/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:modules/toolbar/button/README.md]]
 * @packageDocumentation
 * @module modules/toolbar/button
 */
import type { IControlTypeStrong, IToolbarButton, IToolbarCollection, IViewBased, Nullable } from "../../../types";
import { UIButton } from "../../../core/ui/button";

export declare class ToolbarButton<T extends IViewBased = IViewBased> extends UIButton implements IToolbarButton {
    readonly control: IControlTypeStrong;
    readonly target: Nullable<HTMLElement>;
    /** @override */
    className(): string;
    readonly state: {
        theme: string;
        currentValue: string;
        hasTrigger: boolean;
        size: "small" | "tiny" | "xsmall" | "middle" | "large";
        name: string;
        value: string | number | boolean;
        variant: import("../../../types").ButtonVariant;
        type: "button" | "submit";
        disabled: boolean;
        activated: boolean;
        icon: import("../../../types").IUIIconState;
        text: string;
        tooltip: string;
        tabIndex: import("../../../types").CanUndef<number>;
    };
    protected trigger: HTMLElement;
    /**
     * Get parent toolbar
     */
    protected get toolbar(): Nullable<IToolbarCollection>;
    /** @override **/
    update(): void;
    /**
     * Calculates whether the button is active
     */
    private __calculateActivatedStatus;
    /**
     * Calculates whether an element is blocked for the user
     */
    private __calculateDisabledStatus;
    /** @override */
    protected onChangeActivated(): void;
    /** @override */
    protected onChangeText(): void;
    /** @override */
    protected onChangeTabIndex(): void;
    protected createContainer(): HTMLElement;
    /** @override */
    focus(): void;
    protected onChangeHasTrigger(): void;
    /** @override */
    protected onChangeDisabled(): void;
    constructor(jodit: T, control: IControlTypeStrong, target?: Nullable<HTMLElement>);
    /**
     * Init constant data from control
     */
    protected __initFromControl(): void;
    /**
     * Click on trigger button
     */
    protected onTriggerClick(e: MouseEvent): void;
    private openedPopup;
    /**
     * Create an open popup list
     */
    private __openControlList;
    protected onOutsideClick(e: MouseEvent): void;
    private openPopup;
    private __closePopup;
    /**
     * Click handler
     */
    protected onClick(originalEvent: MouseEvent): void;
    destruct(): any;
}
