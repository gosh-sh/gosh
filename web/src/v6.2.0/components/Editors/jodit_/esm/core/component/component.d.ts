/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:core/component/README.md]]
 * @packageDocumentation
 * @module component
 */
import type { ComponentStatus, IAsync, IComponent, IDictionary, Nullable } from "../../types";
/**
 * The base class of all Jodit UI components. Provides work with a life cycle.
 */
export declare abstract class Component implements IComponent {
    static STATUSES: {
        readonly beforeInit: "beforeInit";
        readonly ready: "ready";
        readonly beforeDestruct: "beforeDestruct";
        readonly destructed: "destructed";
    };
    private __componentName;
    async: IAsync;
    get componentName(): string;
    readonly uid: string;
    /**
     * Calc BEM element class name
     * @param elementName - element name in the bem classification
     */
    getFullElName(elementName: string): string;
    getFullElName(elementName: string, mod: string): string;
    getFullElName(elementName: string, mod: string, modValue: boolean | string): string;
    /**
     * The document in which jodit was created
     */
    get ownerDocument(): Document;
    /**
     * Shortcut for `this.ownerDocument`
     */
    get od(): Document;
    /**
     * The window in which jodit was created
     */
    ownerWindow: Window;
    get ow(): Window;
    /**
     * Safe get any field
     * @example
     * ```js
     * private a = {
     * 	b: {
     * 		c: {
     * 			e: {
     * 				g: {
     * 					color: 'red'
     * 				}
     * 			}
     * 		}
     * 	}
     * }
     *
     * this.get('a.b.c.e.g.color'); // Safe access to color
     * // instead using optionsl chaining
     * this?.a?.b?.c?.e?.g?.color
     * ```
     *
     * @param chain - the path to be traversed in the obj object
     * @param obj - the object in which the value is searched
     */
    get<T>(chain: string, obj?: IDictionary): Nullable<T>;
    /**
     * Component is ready for work
     */
    get isReady(): boolean;
    /**
     * Component was destructed
     */
    get isDestructed(): boolean;
    /**
     * The component is currently undergoing destructuring or has already been destroyed.
     * Those. you should not the app froze new events on him now or do anything else with him.
     */
    get isInDestruct(): boolean;
    /**
     * Bind destructor to some View
     */
    bindDestruct(component: IComponent): this;
    abstract className(): string;
    protected constructor();
    /**
     * Destruct component method
     */
    destruct(): void;
    private __componentStatus;
    /**
     * Current component status
     */
    get componentStatus(): ComponentStatus;
    /**
     * Setter for current component status
     */
    set componentStatus(componentStatus: ComponentStatus);
    /**
     * Set component status
     * @param componentStatus - component status
     * @see ComponentStatus
     */
    setStatus(componentStatus: ComponentStatus): void;
    /**
     * Set status recursively on all parents
     */
    private setStatusComponent;
    /**
     * Adds a handler for changing the component's status
     *
     * @param status - the status at which the callback is triggered
     * @param callback - a function that will be called when the status is `status`
     */
    hookStatus(status: ComponentStatus, callback: (component: this) => void): void;
    static isInstanceOf<T extends Component>(c: unknown | Component, constructorFunc: Function): c is T;
}
