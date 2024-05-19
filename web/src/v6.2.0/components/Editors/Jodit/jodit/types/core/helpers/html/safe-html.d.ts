/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
type safeOptions = {
    removeOnError: boolean;
    safeJavaScriptLink: boolean;
};
/**
 * Removes dangerous constructs from HTML
 */
export declare function safeHTML(box: HTMLElement | DocumentFragment, options: safeOptions): void;
export declare function sanitizeHTMLElement(elm: Element | DocumentFragment, { safeJavaScriptLink, removeOnError }?: safeOptions): boolean;
export {};
