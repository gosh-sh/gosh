/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:core/view/README.md]]
 * @packageDocumentation
 * @module view
 */
import type { IComponent, ICreate, IDictionary, IEventEmitter, IMessages, IProgressBar, IStorage, IViewBased, IViewOptions, Nullable } from "../../types";
import { Component } from "../component/component";
import { Elms } from "../traits/elms";
import { Mods } from "../traits/mods";
export interface View extends Mods, Elms {
}
export declare abstract class View extends Component implements IViewBased, Mods, Elms {
    readonly isJodit: boolean;
    readonly isView: true;
    parent: Nullable<IViewBased>;
    readonly mods: IDictionary<string | boolean | null>;
    /**
     * ID attribute for a source element, id add `{id}_editor` it's editor's id
     */
    id: string;
    /**
     * All created ViewComponent inside this view
     */
    readonly components: Set<IComponent>;
    /**
     * Get a path for loading extra staff
     */
    get basePath(): string;
    static readonly ES: 'es5' | 'es2015' | 'es2018' | 'es2021';
    static readonly version: string;
    static readonly esNext: boolean;
    static readonly esModern: boolean;
    /**
     * Return a default timeout period in milliseconds for some debounce or throttle functions.
     * By default, `{history.timeout}` options
     */
    get defaultTimeout(): number;
    /**
     * Some extra data inside editor
     * @see copyformat plugin
     */
    get buffer(): IStorage;
    get message(): IMessages;
    protected getMessageModule(container: HTMLElement): IMessages;
    /**
     * Container for persistent set/get value
     */
    get storage(): IStorage;
    readonly create: ICreate;
    /**
     * Short alias for `create`
     */
    get c(): this['create'];
    private __container;
    get container(): HTMLDivElement;
    set container(container: HTMLDivElement);
    events: IEventEmitter;
    /**
     * Short alias for `events`
     */
    get e(): this['events'];
    /**
     * progress_bar Progress bar
     */
    get progressbar(): IProgressBar;
    OPTIONS: IViewOptions;
    private __options;
    get options(): this['OPTIONS'];
    set options(options: this['OPTIONS']);
    /**
     * Short alias for options
     */
    get o(): this['options'];
    /**
     * Internationalization method. Uses Jodit.lang object
     */
    i18n(text: string, ...params: Array<string | number>): string;
    private __isFullSize;
    toggleFullSize(isFullSize?: boolean): void;
    private __whoLocked;
    /**
     * View is locked
     */
    get isLocked(): boolean;
    isLockedNotBy: (name: string) => boolean;
    /**
     * Disable selecting
     */
    lock(name?: string): boolean;
    /**
     * Enable selecting
     */
    unlock(): boolean;
    /**
     * View is in fullSize
     */
    get isFullSize(): boolean;
    /**
     * Return current version
     */
    getVersion(): string;
    static getVersion(): string;
    /** @override */
    protected initOptions(options?: Partial<IViewOptions>): void;
    /**
     * Can change ownerWindow here
     */
    protected initOwners(): void;
    /**
     * Add option's event handlers in emitter
     */
    protected attachEvents(options?: IViewOptions): void;
    protected constructor(options?: Partial<IViewOptions>, isJodit?: boolean);
    private __modulesInstances;
    /**
     * Make one instance of one module
     */
    getInstance<T extends IComponent>(module: Function, options?: object): T;
    getInstance<T extends IComponent>(moduleName: string, options?: object): T;
    /** Add some element to box */
    protected addDisclaimer(elm: HTMLElement): void;
    /**
     * Call before destruct
     */
    protected beforeDestruct(): void;
    /** @override */
    destruct(): void;
    static defaultOptions: IViewOptions;
}
