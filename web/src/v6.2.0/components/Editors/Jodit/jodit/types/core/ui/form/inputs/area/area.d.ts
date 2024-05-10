/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module ui/form
 */
import type { IUIInput, IUITextArea, IViewBased } from "../../../../../types";
import { UIInput } from "../input/input";

export declare class UITextArea extends UIInput implements IUITextArea {
    /** @override */
    className(): string;
    /** @override */
    static defaultState: IUITextArea['state'];
    nativeInput: HTMLTextAreaElement;
    protected createNativeInput(options?: Partial<this['state']>): IUIInput['nativeInput'];
    /** @override */
    state: IUITextArea['state'];
    constructor(jodit: IViewBased, state: Partial<IUITextArea['state']>);
    protected onChangeStateSize(): void;
}
