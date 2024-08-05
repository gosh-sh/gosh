/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:core/ui/group/README.md]]
 * @packageDocumentation
 * @module ui/group
 */
import type { IDictionary, IUIButtonState, IUIElement, IUIGroup, IViewBased, ModType } from "../../../types";
import { UIElement } from "../element";

export declare class UIGroup<T extends IViewBased = IViewBased> extends UIElement<T> implements IUIGroup {
    readonly options?: IDictionary | undefined;
    className(): string;
    /**
     * Synchronize mods to all children
     */
    syncMod: boolean;
    elements: IUIElement[];
    /**
     * All group children
     */
    get allChildren(): IUIElement[];
    buttonSize: IUIButtonState['size'];
    /**
     * Update all children
     */
    update(): void;
    /**
     * Append new element into group
     */
    append(elm: IUIElement | IUIElement[], distElement?: string): this;
    /** @override */
    afterSetMod(name: string, value: ModType): void;
    /**
     * Allow set another container for the box of all children
     */
    protected appendChildToContainer(childContainer: HTMLElement): void;
    /**
     * Remove element from group
     */
    remove(elm: IUIElement): this;
    /**
     * Clear group
     */
    clear(): this;
    /**
     * @param elements - Items of group
     */
    constructor(jodit: T, elements?: Array<IUIElement | void | null | false>, options?: IDictionary | undefined);
    /** @override */
    destruct(): any;
}
