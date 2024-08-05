/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/search
 */
import type { IJodit, MarkerInfo, Nullable } from "../../../types";
import { UIElement } from "../../../core/ui";

export declare class UISearch extends UIElement<IJodit> {
    className(): string;
    private queryInput;
    private replaceInput;
    selInfo: Nullable<MarkerInfo[]>;
    private closeButton;
    private replaceButton;
    private currentBox;
    private countBox;
    render(): string;
    private _currentIndex;
    get currentIndex(): number;
    set currentIndex(value: number);
    set count(value: number);
    get query(): string;
    get replace(): string;
    constructor(jodit: IJodit);
    protected onEditorKeyDown(e: KeyboardEvent): void;
    isOpened: boolean;
    open(query?: string, replace?: string, searchAndReplace?: boolean): void;
    close(): void;
    /**
     * Calculate position if sticky is enabled
     */
    private calcSticky;
}
