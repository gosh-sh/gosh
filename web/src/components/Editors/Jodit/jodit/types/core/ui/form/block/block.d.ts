/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module ui/form
 */
import type { IUIElement, IViewBased } from "../../../../types";
import { UIGroup } from "../../group/group";

export declare class UIBlock extends UIGroup {
    readonly options: {
        className?: string;
        align?: 'center' | 'left' | 'right' | 'full';
        width?: 'full';
        ref?: string;
        mod?: string;
    };
    /** @override */
    className(): string;
    constructor(jodit: IViewBased, elements?: Array<IUIElement | void | null | false>, options?: {
        className?: string;
        align?: 'center' | 'left' | 'right' | 'full';
        width?: 'full';
        ref?: string;
        mod?: string;
    });
}
