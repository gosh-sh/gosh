/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module ui/group
 */
import type { ButtonsOption, IControlTypeStrong, IUIButton, IUIList, IViewBased, Nullable } from "../../../types";
import { UIGroup } from "./group";

export declare class UIList<T extends IViewBased = IViewBased> extends UIGroup<T> implements IUIList {
    /** @override */
    className(): string;
    jodit: T;
    mode: IUIList['mode'];
    protected __onChangeMode(): void;
    constructor(jodit: T);
    /**
     * Make new group and append it in list of elements
     */
    private makeGroup;
    /**
     * All buttons from list
     */
    get buttons(): IUIButton[];
    /**
     * Helper for getting full plain button list
     */
    getButtonsNames(): string[];
    protected removeButtons: string[];
    setRemoveButtons(removeButtons?: string[]): this;
    build(items: ButtonsOption, target?: Nullable<HTMLElement>): IUIList;
    protected makeSelect(control: IControlTypeStrong, target: Nullable<HTMLElement>): IUIButton;
    /**
     * Create button instance
     */
    protected makeButton(control: IControlTypeStrong, target: Nullable<HTMLElement>): IUIButton;
}
