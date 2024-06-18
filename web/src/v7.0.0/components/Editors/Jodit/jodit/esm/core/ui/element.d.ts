/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module ui
 */
import type { IDictionary, IUIElement, IViewBased, Nullable } from "../../types";
import { ViewComponent } from "../component";
import { Elms } from "../traits/elms";
import { Mods } from "../traits/mods";
export interface UIElement extends Mods, Elms {
}
export declare abstract class UIElement<T extends IViewBased = IViewBased> extends ViewComponent<T> implements IUIElement, Mods, Elms {
    container: HTMLElement;
    name: string;
    private __parentElement;
    get parentElement(): Nullable<IUIElement>;
    set parentElement(parentElement: Nullable<IUIElement>);
    bubble(callback: (parent: IUIElement) => void): this;
    updateParentElement(target: IUIElement): this;
    /** @override */
    get<T>(chain: string, obj?: IDictionary): Nullable<T>;
    /**
     * Find match parent
     */
    closest<T extends UIElement | typeof UIElement>(type: UIElement | Function): Nullable<T extends typeof UIElement ? InstanceType<T> : T>;
    /**
     * Find closest UIElement in DOM
     */
    static closestElement(node: Node, type: Function): Nullable<IUIElement>;
    readonly mods: IDictionary<string | boolean | null>;
    /**
     * Update UI from state
     */
    update(): void;
    /**
     * Append container to element
     */
    appendTo(element: HTMLElement): this;
    /**
     * Valid name only with valid chars
     */
    protected clearName(name: string): string;
    /**
     * Method create only box
     */
    protected render(options?: IDictionary): HTMLElement | string;
    /**
     * Create main HTML container
     */
    protected createContainer(options?: IDictionary): HTMLElement;
    protected parseTemplate(result: string): HTMLElement;
    /** @override */
    constructor(jodit: T, options?: IDictionary);
    /** @override */
    destruct(): any;
}
