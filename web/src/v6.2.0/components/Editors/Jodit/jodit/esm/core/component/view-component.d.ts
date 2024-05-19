/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module component
 */
import type { IViewBased, IViewComponent } from "../../types";
import { Component } from "./component";
export declare abstract class ViewComponent<T extends IViewBased = IViewBased> extends Component implements IViewComponent<T> {
    /**
     * Parent View element
     */
    jodit: T;
    /**
     * Shortcut for `this.jodit`
     */
    get j(): T;
    get defaultTimeout(): number;
    i18n(text: string, ...params: Array<string | number>): string;
    /**
     * Attach component to View
     */
    setParentView(jodit: T): this;
    constructor(jodit: T);
    /** @override */
    destruct(): any;
}
