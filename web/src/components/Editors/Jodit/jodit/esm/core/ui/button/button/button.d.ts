/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module ui/button
 */
import type { ButtonVariant, IUIButton, IUIButtonState, IUIButtonStatePartial, IViewBased } from "../../../../types";
import { UIElement } from "../../element";

export declare const UIButtonState: () => IUIButtonState;
export declare class UIButton extends UIElement implements IUIButton {
    /** @override */
    className(): string;
    /**
     * Marker for buttons
     */
    readonly isButton: true;
    readonly state: IUIButtonState;
    /**
     * Set state
     */
    setState(state: IUIButtonStatePartial): this;
    /**
     * DOM container for text content
     */
    get text(): HTMLElement;
    /**
     * DOM container for icon
     */
    get icon(): HTMLElement;
    /**
     * DOM container for button
     */
    protected button: HTMLElement;
    protected onChangeSize(): void;
    protected onChangeType(): void;
    /**
     * Set size from a parent list
     */
    protected updateSize(): void;
    protected onChangeStatus(): void;
    protected onChangeText(): void;
    protected onChangeTextSetMode(): void;
    protected onChangeDisabled(): void;
    protected onChangeActivated(): void;
    protected onChangeName(): void;
    protected onChangeTooltip(): void;
    protected onChangeTabIndex(): void;
    protected onChangeIcon(): void;
    /**
     * Set focus on an element
     */
    focus(): void;
    /**
     * Element has focus
     */
    isFocused(): boolean;
    /** @override */
    protected createContainer(): HTMLElement;
    constructor(jodit: IViewBased, state?: IUIButtonStatePartial);
    destruct(): any;
    private readonly actionHandlers;
    /**
     * Add action handler
     */
    onAction(callback: (originalEvent: MouseEvent) => void): this;
    /**
     * Fire all click handlers
     */
    protected __onActionFire(e: MouseEvent): void;
}
export declare function Button(jodit: IViewBased, icon: string): IUIButton;
export declare function Button(jodit: IViewBased, icon: string, text?: string): IUIButton;
export declare function Button(jodit: IViewBased, icon: string, text: string, variant?: ButtonVariant): IUIButton;
export declare function Button(jodit: IViewBased, state: IUIButtonStatePartial, variant?: ButtonVariant): IUIButton;
