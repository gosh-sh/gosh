/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:modules/toolbar/README.md]]
 * @packageDocumentation
 * @module modules/toolbar
 */
import type { IControlTypeStrong, IToolbarButton, IToolbarCollection, IUIElement, IViewBased, Nullable } from "../../types";
/**
 * Collection factory
 */
export declare function makeCollection(jodit: IViewBased, parentElement?: IUIElement): IToolbarCollection;
/**
 * Button factory
 */
export declare function makeButton(jodit: IViewBased, control: IControlTypeStrong, target?: Nullable<HTMLElement>): IToolbarButton;
export declare function makeSelect(view: IViewBased, control: IControlTypeStrong, target?: Nullable<HTMLElement>): IToolbarButton;
