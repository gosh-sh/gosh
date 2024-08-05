/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module ui/button
 */
import type { IDictionary, IUIButton, IUIOption, IViewBased } from "../../../../types";
import { UIGroup } from "../../group/group";

export declare class UIButtonGroup extends UIGroup {
    readonly options: {
        name?: string;
        value?: string | boolean | number;
        label?: string;
        onChange?: (values: IUIOption[]) => void;
        options?: IUIOption[];
        radio: boolean;
    };
    elements: IUIButton[];
    /** @override */
    className(): string;
    /** @override */
    protected render(options: IDictionary): string;
    /** @override */
    protected appendChildToContainer(childContainer: HTMLElement): void;
    constructor(jodit: IViewBased, options?: {
        name?: string;
        value?: string | boolean | number;
        label?: string;
        onChange?: (values: IUIOption[]) => void;
        options?: IUIOption[];
        radio: boolean;
    });
    protected select(indexOrValue: IUIOption['value'] | number): void;
}
