/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module ui/form
 */
import type { IUISelect, IViewBased } from "../../../../../types";
import { UIInput } from "../input/input";

export declare class UISelect extends UIInput implements IUISelect {
    /** @override */
    className(): string;
    /** @override */
    nativeInput: IUISelect['nativeInput'];
    /** @override */
    static defaultState: IUISelect['state'];
    /** @override */
    state: IUISelect['state'];
    /** @override **/
    protected createContainer(state: Partial<IUISelect['state']>): HTMLElement;
    /** @override **/
    protected createNativeInput(): IUISelect['nativeInput'];
    /** @override **/
    protected updateValidators(): void;
    constructor(jodit: IViewBased, state: Partial<IUISelect['state']>);
}
