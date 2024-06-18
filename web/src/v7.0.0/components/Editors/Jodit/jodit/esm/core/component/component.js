/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Async } from "../async/index.js";
import { STATUSES } from "./statuses.js";
import { uniqueUid } from "../global.js";
import { get, getClassName, isFunction, isVoid, kebabCase } from "../helpers/index.js";
const StatusListHandlers = new Map();
/**
 * The base class of all Jodit UI components. Provides work with a life cycle.
 */
export class Component {
    get componentName() {
        if (!this.__componentName) {
            this.__componentName =
                'jodit-' +
                    kebabCase((isFunction(this.className) ? this.className() : '') ||
                        getClassName(this));
        }
        return this.__componentName;
    }
    getFullElName(elementName, mod, modValue) {
        const result = [this.componentName];
        if (elementName) {
            elementName = elementName.replace(/[^a-z0-9-]/gi, '-');
            result.push(`__${elementName}`);
        }
        if (mod) {
            result.push('_', mod);
            result.push('_', isVoid(modValue) ? 'true' : modValue.toString());
        }
        return result.join('');
    }
    /**
     * The document in which jodit was created
     */
    get ownerDocument() {
        return this.ow.document;
    }
    /**
     * Shortcut for `this.ownerDocument`
     */
    get od() {
        return this.ownerDocument;
    }
    get ow() {
        return this.ownerWindow;
    }
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
    get(chain, obj) {
        return get(chain, obj || this);
    }
    /**
     * Component is ready for work
     */
    get isReady() {
        return this.componentStatus === STATUSES.ready;
    }
    /**
     * Component was destructed
     */
    get isDestructed() {
        return this.componentStatus === STATUSES.destructed;
    }
    /**
     * The component is currently undergoing destructuring or has already been destroyed.
     * Those. you should not the app froze new events on him now or do anything else with him.
     */
    get isInDestruct() {
        return (STATUSES.beforeDestruct === this.componentStatus ||
            STATUSES.destructed === this.componentStatus);
    }
    /**
     * Bind destructor to some View
     */
    bindDestruct(component) {
        component.hookStatus(STATUSES.beforeDestruct, () => !this.isInDestruct && this.destruct());
        return this;
    }
    constructor() {
        this.async = new Async();
        /**
         * The window in which jodit was created
         */
        this.ownerWindow = window;
        this.__componentStatus = STATUSES.beforeInit;
        this.uid = 'jodit-uid-' + uniqueUid();
    }
    /**
     * Destruct component method
     */
    destruct() {
        this.setStatus(STATUSES.destructed);
        if (this.async) {
            this.async.destruct();
            // @ts-ignore
            this.async = undefined;
        }
        if (StatusListHandlers.get(this)) {
            StatusListHandlers.delete(this);
        }
        // @ts-ignore
        this.ownerWindow = undefined;
    }
    /**
     * Current component status
     */
    get componentStatus() {
        return this.__componentStatus;
    }
    /**
     * Setter for current component status
     */
    set componentStatus(componentStatus) {
        this.setStatus(componentStatus);
    }
    /**
     * Set component status
     * @param componentStatus - component status
     * @see ComponentStatus
     */
    setStatus(componentStatus) {
        return this.setStatusComponent(componentStatus, this);
    }
    /**
     * Set status recursively on all parents
     */
    setStatusComponent(componentStatus, component) {
        if (componentStatus === this.__componentStatus) {
            return;
        }
        if (component === this) {
            this.__componentStatus = componentStatus;
        }
        const proto = Object.getPrototypeOf(this);
        if (proto && isFunction(proto.setStatusComponent)) {
            proto.setStatusComponent(componentStatus, component);
        }
        const statuses = StatusListHandlers.get(this), list = statuses?.[componentStatus];
        if (list && list.length) {
            list.forEach(cb => cb(component));
        }
    }
    /**
     * Adds a handler for changing the component's status
     *
     * @param status - the status at which the callback is triggered
     * @param callback - a function that will be called when the status is `status`
     */
    hookStatus(status, callback) {
        let list = StatusListHandlers.get(this);
        if (!list) {
            list = {};
            StatusListHandlers.set(this, list);
        }
        if (!list[status]) {
            list[status] = [];
        }
        list[status].push(callback);
    }
    static isInstanceOf(c, constructorFunc) {
        return c instanceof constructorFunc;
    }
}
Component.STATUSES = STATUSES;
