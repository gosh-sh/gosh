/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module helpers/utils
 */
import type { HTMLTagNames, IDictionary, Nullable } from "../../../types";
/**
 * Find all elements by selector and return Array. If it did not find any element, it is return empty array
 * @internal
 *
 * @example
 * ```javascript
 * Jodit.modules.Helpers.$$('.someselector').forEach(function (elm) {
 *      elm.addEventListener('click', function () {
 *          alert(''Clicked');
 *      });
 * })
 * ```
 * @param selector - CSS like selector
 * @param root - where to search
 */
export declare function $$<K extends HTMLTagNames>(selector: K, root: HTMLElement | DocumentFragment): Array<HTMLElementTagNameMap[K]>;
export declare function $$<T extends HTMLElement>(selector: string, root: HTMLElement | DocumentFragment): T[];
/**
 * Calculate XPath selector
 */
export declare const getXPathByElement: (element: HTMLElement, root: HTMLElement) => string;
/**
 * Find all `ref` or `data-ref` elements inside HTMLElement
 */
export declare const refs: <T extends HTMLElement>(root: HTMLElement | {
    container: HTMLElement;
}) => IDictionary<T>;
/**
 * Calculate full CSS selector
 */
export declare const cssPath: (el: Element) => Nullable<string>;
/**
 * Try to find element by selector
 */
export declare function resolveElement(element: string | HTMLElement | unknown, od: ShadowRoot | Document): HTMLElement;
