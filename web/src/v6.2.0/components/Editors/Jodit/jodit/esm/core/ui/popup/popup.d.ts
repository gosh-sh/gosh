/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:core/ui/popup/README.md]]
 * @packageDocumentation
 * @module ui/popup
 */
import type { IBound, IPopup, IUIElement, IViewBased, PopupStrategy } from "../../../types";
import { UIGroup } from "../group/group";

type getBoundFunc = () => IBound;
export declare class Popup extends UIGroup implements IPopup {
    readonly smart: boolean;
    className(): string;
    isOpened: boolean;
    strategy: PopupStrategy;
    protected appendChildToContainer(childContainer: HTMLElement): void;
    viewBound: () => IBound;
    private __targetBound;
    private __childrenPopups;
    updateParentElement(target: IUIElement): this;
    /**
     * Set popup content
     */
    setContent(content: IUIElement | HTMLElement | string): this;
    /**
     * Open popup near with some bound
     */
    open(getBound: getBoundFunc, keepPosition?: boolean, parentContainer?: HTMLElement): this;
    private __calculateZIndex;
    /**
     * Calculate static bound for point
     */
    protected getKeepBound(getBound: getBoundFunc): getBoundFunc;
    /**
     * Update container position
     */
    updatePosition(): this;
    private __throttleUpdatePosition;
    /**
     * Calculate start point
     */
    private __calculatePosition;
    /**
     * Check if one box is inside second
     */
    private static boxInView;
    /**
     * Close popup
     */
    close(): this;
    /**
     * Close popup if click was in outside
     */
    private __closeOnOutsideClick;
    isOwnClick(e: MouseEvent): boolean;
    private __addGlobalListeners;
    private __removeGlobalListeners;
    /**
     * Set ZIndex
     */
    setZIndex(index: number | string): void;
    constructor(jodit: IViewBased, smart?: boolean);
    render(): string;
    /** @override **/
    destruct(): any;
}
export {};
