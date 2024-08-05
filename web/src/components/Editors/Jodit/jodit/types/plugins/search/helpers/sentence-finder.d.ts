/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/search
 */
import type { FuzzySearch, ISelectionRange, Nullable } from "../../../types";
export interface State {
    query: string;
    sentence: SentenceFinder;
}
export declare class SentenceFinder {
    private readonly searchIndex;
    private queue;
    private value;
    constructor(searchIndex?: FuzzySearch);
    add(node: Text): void;
    ranges(needle: string, position?: number): Nullable<ISelectionRange[]>;
}
