/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module modules/toolbar/button
 */
import type { IControlTypeContent, IToolbarButton, IViewBased, Nullable } from "../../../types";
import { UIButton } from "../../../core/ui/button";

export declare class ToolbarContent<T extends IViewBased = IViewBased> extends UIButton implements IToolbarButton {
    readonly control: IControlTypeContent;
    readonly target: Nullable<HTMLElement>;
    /** @override */
    className(): string;
    /** @override */
    update(): void;
    /** @override */
    protected createContainer(): HTMLElement;
    constructor(jodit: T, control: IControlTypeContent, target?: Nullable<HTMLElement>);
}
