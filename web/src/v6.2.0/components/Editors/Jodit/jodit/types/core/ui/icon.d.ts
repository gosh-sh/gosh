/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module ui
 */
import type { CanUndef, IUIIconState, IViewBased } from "../../types";
export declare class Icon {
    private static icons;
    private static getIcon;
    /**
     * Check if icon exist in store
     */
    static exists(name: string): boolean;
    /**
     * Return SVG icon
     */
    static get(name: string, defaultValue?: string): string;
    /**
     * Set SVG in store
     */
    static set(name: string, value: string): typeof Icon;
    private static __cache;
    /**
     * Make icon html element
     */
    static makeIcon(jodit: IViewBased, icon: IUIIconState): CanUndef<Node>;
}
