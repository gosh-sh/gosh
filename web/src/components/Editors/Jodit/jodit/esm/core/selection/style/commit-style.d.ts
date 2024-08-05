/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module selection
 */
import type { HTMLTagNames, ICommitStyle, IJodit, IStyleOptions } from "../../../types";
export declare class CommitStyle implements ICommitStyle {
    readonly options: IStyleOptions;
    private __applyMap;
    isApplied(elm: HTMLElement, key: string): boolean;
    setApplied(elm: HTMLElement, key: string): void;
    get elementIsList(): boolean;
    get element(): HTMLTagNames;
    /**
     * New element is blocked
     */
    get elementIsBlock(): boolean;
    /**
     * The commit applies the tag change
     */
    get isElementCommit(): boolean;
    get defaultTag(): HTMLTagNames;
    get elementIsDefault(): Boolean;
    constructor(options: IStyleOptions);
    apply(jodit: IJodit): void;
}
