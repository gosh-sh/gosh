/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:core/dom/README.md]]
 * @packageDocumentation
 * @module dom
 */
import type { HTMLTagNames, ICreate, IDictionary, IJodit, NodeCondition, Nullable } from "../../types";
/**
 * Module for working with DOM
 */
export declare class Dom {
    private constructor();
    /**
     * Remove all content from element
     */
    static detach(node: Nullable<Node>): void;
    /**
     * Wrap all inline siblings
     */
    static wrapInline(current: Node, tag: Node | HTMLTagNames, editor: IJodit): HTMLElement;
    static wrap<K extends HTMLTagNames>(current: Node | Range, tag: HTMLElement, create: ICreate): HTMLElementTagNameMap[K];
    static wrap<K extends HTMLTagNames>(current: Node | Range, tag: K, create: ICreate): HTMLElementTagNameMap[K];
    /**
     * Remove parent of node and insert this node instead that parent
     */
    static unwrap(node: Node): void;
    /**
     * Call functions for all nodes between `start` and `end`
     */
    static between(start: Node, end: Node, callback: (node: Node) => void | boolean): void;
    /**
     * Replace one tag to another transfer content
     *
     * @param elm - The element that needs to be replaced by new
     * @param newTagName - tag name for which will change `elm`
     * @param withAttributes - If true move tag's attributes
     * @param notMoveContent - false - Move content from elm to newTagName
     * @example
     * ```javascript
     * Jodit.modules.Dom.replace(parent.editor.getElementsByTagName('span')[0], 'p');
     * // Replace the first <span> element to the < p >
     * ```
     */
    static replace<T extends HTMLElement>(elm: Node, newTagName: HTMLTagNames, create: ICreate, withAttributes?: boolean, notMoveContent?: boolean): T;
    static replace<T extends Node>(elm: Node, newTagName: T | string, create: ICreate, withAttributes?: boolean, notMoveContent?: boolean): T;
    /**
     * Checks whether the Node text and blank (in this case it may contain invisible auxiliary characters ,
     * it is also empty )
     *
     * @param node - The element of wood to be checked
     */
    static isEmptyTextNode(node: Nullable<Node>): boolean;
    static isEmptyContent(node: Node): boolean;
    /**
     * The node is editable
     */
    static isContentEditable(node: Nullable<Node>, root: HTMLElement): boolean;
    /**
     * Check if element is empty
     */
    static isEmpty(node: Node, condNoEmptyElement: (node: Element) => boolean): boolean;
    static isEmpty(node: Node, noEmptyTags?: Set<string>): boolean;
    /**
     * Returns true if it is a DOM node
     */
    static isNode(object: unknown): object is Node;
    /**
     *  Check if element is table cell
     */
    static isCell(elm: unknown): elm is HTMLTableCellElement;
    /**
     * Check if element is a list	element UL or OL
     */
    static isList(elm: Nullable<Node>): elm is HTMLOListElement;
    /**
     * Check if element is a part of list	element LI
     */
    static isLeaf(elm: Nullable<Node>): elm is HTMLLIElement;
    /**
     * Check is element is Image element
     */
    static isImage(elm: unknown): elm is HTMLImageElement;
    /**
     * Check the `node` is a block element
     * @param node - Object to check
     */
    static isBlock(node: unknown): node is HTMLDivElement;
    /**
     * Check if element is text node
     */
    static isText(node: Node | null | false): node is Text;
    /**
     * Check if element is comment node
     */
    static isComment(node: Node): node is Comment;
    /**
     * Check if element is element node
     */
    static isElement(node: unknown): node is Element;
    /**
     * Check if element is document fragment
     */
    static isFragment(node: unknown): node is DocumentFragment;
    /**
     * Check if element is HTMLElement node
     */
    static isHTMLElement(node: unknown): node is HTMLElement;
    /**
     * Check element is inline block
     */
    static isInlineBlock(node: Node | null | false): node is HTMLElement;
    /**
     * It's block and it can be split
     */
    static canSplitBlock(node: unknown): boolean;
    /**
     * Get last matched node inside root
     */
    static last(root: Nullable<Node>, condition: NodeCondition): Nullable<Node>;
    /**
     * Find previous node
     */
    static prev<T extends Node = Node>(node: Node, condition: NodeCondition, root: HTMLElement, withChild?: boolean): Nullable<T>;
    /**
     * Find next node what `condition(next) === true`
     */
    static next<T extends Node = Node>(node: Node, condition: NodeCondition, root: HTMLElement, withChild?: boolean): Nullable<T>;
    static prevWithClass(node: HTMLElement, className: string): Nullable<HTMLElement>;
    static nextWithClass(node: HTMLElement, className: string): Nullable<HTMLElement>;
    /**
     * Find next/prev node what `condition(next) === true`
     */
    static find<T extends Node = Node>(node: Node, condition: NodeCondition, root: HTMLElement, leftToRight?: boolean, withChild?: boolean): Nullable<T>;
    /**
     * Find next/prev node what `condition(next) === true`
     */
    static nextGen(start: Node, root: HTMLElement, leftToRight?: boolean, withChild?: boolean): Generator<Node>;
    /**
     * It goes through all the internal elements of the node, causing a callback function
     *
     * @param elm - the element whose children and descendants you want to iterate over
     * @param callback - It called for each item found
     * @example
     * ```javascript
     * Jodit.modules.Dom.each(editor.s.current(), function (node) {
     *  if (node.nodeType === Node.TEXT_NODE) {
     *      node.nodeValue = node.nodeValue.replace(Jodit.INVISIBLE_SPACE_REG_EX, '') // remove all of the text element codes invisible character
     *  }
     * });
     * ```
     */
    static each(elm: Node, callback: (node: Node) => void | boolean, leftToRight?: boolean): boolean;
    static eachGen(root: Node, leftToRight?: boolean): Generator<Node>;
    private static runInStack;
    /**
     * Find next/prev node what `condition(next) === true`
     */
    static findWithCurrent(node: Node, condition: NodeCondition, root: HTMLElement | Node, sibling?: 'nextSibling' | 'previousSibling', child?: 'firstChild' | 'lastChild'): Nullable<Node>;
    /**
     * Get not empty sibling
     */
    static findSibling(node: Node, left?: boolean, cond?: (n: Node) => boolean): Nullable<Node>;
    /**
     * Returns the nearest non-empty sibling
     */
    static findNotEmptySibling(node: Node, left: boolean): Nullable<Node>;
    /**
     * Returns the nearest non-empty neighbor
     */
    static findNotEmptyNeighbor(node: Node, left: boolean, root: HTMLElement): Nullable<Node>;
    static sibling(node: Node, left?: boolean): Nullable<Node>;
    /**
     * It goes through all the elements in ascending order, and checks to see if they meet the predetermined condition
     */
    static up<T extends HTMLElement>(node: Nullable<Node>, condition: NodeCondition, root?: Node, checkRoot?: boolean): Nullable<T>;
    /**
     * Find parent by tag name
     */
    static closest<T extends HTMLElement, K extends HTMLTagNames>(node: Nullable<Node>, tags: K, root: HTMLElement): Nullable<HTMLElementTagNameMap[K]>;
    static closest<T extends HTMLElement, K extends keyof HTMLElementTagNameMap>(node: Nullable<Node>, tags: Set<K>, root: HTMLElement): Nullable<HTMLElementTagNameMap[K]>;
    static closest<T extends HTMLElement, K extends keyof HTMLElementTagNameMap>(node: Nullable<Node>, tags: K[], root: HTMLElement): Nullable<HTMLElementTagNameMap[K]>;
    static closest<T extends HTMLElement>(node: Nullable<Node>, condition: NodeCondition, root: HTMLElement): Nullable<T>;
    /**
     * Furthest parent node matching condition
     */
    static furthest<T extends HTMLElement>(node: Nullable<Node>, condition: NodeCondition, root: HTMLElement): Nullable<T>;
    /**
     * Append new element in the start of root
     */
    static appendChildFirst(root: HTMLElement, newElement: HTMLElement | DocumentFragment): void;
    /**
     * Insert newElement after element
     */
    static after(elm: Node, newElement: Node | DocumentFragment): void;
    /**
     * Insert newElement before element
     */
    static before(elm: Node, newElement: Node | DocumentFragment): void;
    /**
     * Insert newElement as first child inside element
     */
    static prepend(root: Node, newElement: Node | DocumentFragment): void;
    /**
     * Insert newElement as last child inside element
     */
    static append(root: Node, newElements: Array<Node | DocumentFragment>): void;
    static append(root: Node, newElement: Node | DocumentFragment): void;
    /**
     * Move all content to another element
     */
    static moveContent(from: Node, to: Node, inStart?: boolean, filter?: (node: Node) => boolean): void;
    /**
     * Check root contains child or equal child
     */
    static isOrContains(root: Node, child: Node, onlyContains?: boolean): boolean;
    /**
     * Safe remove element from DOM
     */
    static safeRemove(...nodes: unknown[]): void;
    static safeInsertNode(range: Range, node: Node): void;
    /**
     * Hide element
     */
    static hide(node: Nullable<HTMLElement>): void;
    /**
     * Show element
     */
    static show(node: Nullable<HTMLElement>): void;
    /**
     * Check if element is some tag
     */
    static isTag<K extends HTMLTagNames>(node: Node | null | undefined | false | EventTarget, tagName: K): node is HTMLElementTagNameMap[K];
    static isTag<K extends HTMLTagNames>(node: Node | null | undefined | false | EventTarget, tagNames: Set<K>): node is HTMLElementTagNameMap[K];
    /**
     * Marks an item as temporary
     */
    static markTemporary<K extends HTMLElement>(element: K, attributes?: IDictionary): K;
    /**
     * Check if element is temporary
     */
    static isTemporary(element: unknown): boolean;
    /**
     * Replace temporary elements from string
     */
    static replaceTemporaryFromString(value: string): string;
    /**
     * Get temporary list
     */
    static temporaryList(root: HTMLElement): HTMLElement[];
}
