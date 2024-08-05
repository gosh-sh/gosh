/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:core/plugin/README.md]]
 * @packageDocumentation
 * @module plugin
 */
import type { CanUndef, IJodit, IPlugin, IViewBased } from "../../types";
import { ViewComponent } from "../component";
export declare abstract class Plugin<T extends IViewBased = IJodit> extends ViewComponent<T> implements IPlugin<T> {
    static requires: string[];
    /** @override */
    buttons: IPlugin['buttons'];
    /**
     * Plugin have CSS style and it should be loaded
     */
    hasStyle: boolean;
    /**
     * Additional plugin styles can be written simply as inline styles
     * ```js
     * class A extends Jodit.modules.Plugin {
     *   styles = 'h1{color: red}';
     * }
     * ```
     * Will only be applied if the plugin is activated
     */
    styles: CanUndef<string>;
    /** @override */
    className(): string;
    private __inited;
    protected abstract afterInit(jodit: T): void;
    protected abstract beforeDestruct(jodit: T): void;
    constructor(jodit: T);
    private __afterPluginSystemInit;
    private __afterInit;
    init(jodit: T): void;
    private __beforeDestruct;
}
