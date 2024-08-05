/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/search/README.md]]
 * @packageDocumentation
 * @module plugins/search
 */
import type { IJodit, IPlugin, ISelectionRange, Nullable } from "../../types";
import { LazyWalker } from "../../core/dom";
import { Plugin } from "../../core/plugin";
import "./config";
/**
 * Search plugin. it is used for custom search in text
 * ![search](https://user-images.githubusercontent.com/794318/34545433-cd0a9220-f10e-11e7-8d26-7e22f66e266d.gif)
 *
 * @example
 * ```typescript
 * var jodit = Jodit.make('#editor', {
 *  useSearch: false
 * });
 * // or
 * var jodit = Jodit.make('#editor', {
 *  disablePlugins: 'search'
 * });
 * ```
 */
export declare class search extends Plugin {
    buttons: IPlugin['buttons'];
    private get ui();
    private updateCounters;
    protected onPressReplaceButton(): void;
    private tryScrollToElement;
    protected calcCounts(query: string): Promise<number>;
    findQueryBounds(query: string, walkerKey: 'walker' | 'walkerCount'): Promise<ISelectionRange[]>;
    findAndReplace(query: string): Promise<boolean>;
    private previousQuery;
    private drawPromise;
    findAndSelect(query: string, next: boolean): Promise<boolean>;
    private findCurrentIndexInRanges;
    walker: Nullable<LazyWalker>;
    walkerCount: Nullable<LazyWalker>;
    private cache;
    private isValidCache;
    private find;
    private wrapFrameRequest;
    private __drawSelectionRanges;
    protected onAfterGetValueFromEditor(data: {
        value: string;
    }): void;
    /** @override */
    afterInit(editor: IJodit): void;
    /** @override */
    beforeDestruct(jodit: IJodit): void;
}
