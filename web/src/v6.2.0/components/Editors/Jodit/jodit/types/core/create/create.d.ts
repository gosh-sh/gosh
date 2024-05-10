/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:core/create/README.md]]
 * @packageDocumentation
 * @module create
 */
import type { Attributes, CanUndef, Children, ICreate, IDictionary, NodeFunction } from "../../types";
export declare class Create implements ICreate {
    readonly document: Document | (() => Document);
    readonly createAttributes?: CanUndef<IDictionary<Attributes | NodeFunction>>;
    private get doc();
    constructor(document: Document | (() => Document), createAttributes?: CanUndef<IDictionary<Attributes | NodeFunction>>);
    element<K extends keyof HTMLElementTagNameMap>(tagName: K, children?: Children): HTMLElementTagNameMap[K];
    element<K extends keyof HTMLElementTagNameMap>(tagName: K, attributes?: Attributes, children?: Children): HTMLElementTagNameMap[K];
    div(className?: string, childrenOrAttributes?: Children): HTMLDivElement;
    div(className?: string, childrenOrAttributes?: Attributes, children?: Children): HTMLDivElement;
    sandbox(): [
        HTMLElement,
        HTMLIFrameElement
    ];
    span(className?: string, childrenOrAttributes?: Children): HTMLSpanElement;
    span(className?: string, childrenOrAttributes?: Attributes, children?: Children): HTMLSpanElement;
    a(className?: string, children?: Children): HTMLAnchorElement;
    a(className?: string, childrenOrAttributes?: Attributes, children?: Children): HTMLAnchorElement;
    /**
     * Create text node
     */
    text(value: string): Text;
    /**
     * Create invisible text node
     */
    fake(): Text;
    /**
     * Create HTML Document fragment element
     */
    fragment(): DocumentFragment;
    /**
     * Create a DOM element from HTML text
     *
     // eslint-disable-next-line tsdoc/syntax
     * @param refsToggleElement - State dictionary in which you can set the visibility of some of the elements
     * ```js
     * const editor = Jodit.make('#editor');
     * editor.createInside.fromHTML(`<div>
     *   <input name="name" ref="name"/>
     *   <input name="email" ref="email"/>
     * </div>`, {
     *   name: true,
     *   email: false
     * });
     * ```
     */
    fromHTML<T extends HTMLElement>(html: string | number, refsToggleElement?: IDictionary<boolean | void>): T;
    /**
     * Apply to element `createAttributes` options
     */
    applyCreateAttributes(elm: HTMLElement): void;
}
