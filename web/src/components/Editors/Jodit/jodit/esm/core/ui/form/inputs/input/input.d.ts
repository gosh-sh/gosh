/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module ui/form
 */
import type { IUIInput, IUIInputValidator, IViewBased } from "../../../../../types";
import { UIElement } from "../../../element";

export declare class UIInput extends UIElement implements IUIInput {
    /** @override */
    className(): string;
    nativeInput: IUIInput['nativeInput'];
    private label;
    private icon;
    private clearButton;
    private wrapper;
    static defaultState: IUIInput['state'];
    state: IUIInput['state'];
    protected onChangeClear(): void;
    protected onChangeClassName(ignore?: unknown, oldClassName?: string): void;
    protected onChangeState(): void;
    protected updateValidators(): void;
    private __errorBox;
    set error(value: string);
    get value(): string;
    set value(value: string);
    /**
     * Call on every state value changed
     */
    protected onChangeStateValue(): void;
    /**
     * Call on every native value changed
     */
    protected onChangeValue(): void;
    protected validators: Set<IUIInputValidator>;
    validate(): boolean;
    /** @override **/
    protected createContainer(options: Partial<this['state']>): HTMLElement;
    /**
     * Create native input element
     */
    protected createNativeInput(options?: Partial<this['state']>): IUIInput['nativeInput'];
    /** @override **/
    constructor(jodit: IViewBased, options?: Partial<IUIInput['state']>);
    focus(): void;
    get isFocused(): boolean;
    /**
     * Set `focused` mod on change focus
     */
    private onChangeFocus;
}
