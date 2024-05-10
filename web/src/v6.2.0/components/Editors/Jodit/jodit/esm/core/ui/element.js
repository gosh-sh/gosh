/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
        r = Reflect.decorate(decorators, target, key, desc);
    else
        for (var i = decorators.length - 1; i >= 0; i--)
            if (d = decorators[i])
                r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var UIElement_1;
import { Component, ViewComponent } from "../component/index.js";
import { derive } from "../decorators/derive/derive.js";
import { Dom } from "../dom/dom.js";
import { isString } from "../helpers/checker/is-string.js";
import { Elms } from "../traits/elms.js";
import { Mods } from "../traits/mods.js";
import { Icon } from "./icon.js";
let UIElement = UIElement_1 = class UIElement extends ViewComponent {
    get parentElement() {
        return this.__parentElement;
    }
    set parentElement(parentElement) {
        this.__parentElement = parentElement;
        if (parentElement) {
            parentElement.hookStatus('beforeDestruct', () => this.destruct());
        }
        this.updateParentElement(this);
    }
    bubble(callback) {
        let parent = this.parentElement;
        while (parent) {
            callback(parent);
            parent = parent.parentElement;
        }
        return this;
    }
    updateParentElement(target) {
        this.__parentElement?.updateParentElement(target);
        return this;
    }
    /** @override */
    get(chain, obj) {
        return super.get(chain, obj) || this.getElm(chain);
    }
    /**
     * Find match parent
     */
    closest(type) {
        const c = typeof type === 'object'
            ? (pe) => pe === type
            : (pe) => Component.isInstanceOf(pe, type);
        let pe = this.__parentElement;
        while (pe) {
            if (c(pe)) {
                return pe;
            }
            if (!pe.parentElement && pe.container.parentElement) {
                pe = UIElement_1.closestElement(pe.container.parentElement, UIElement_1);
            }
            else {
                pe = pe.parentElement;
            }
        }
        return null;
    }
    /**
     * Find closest UIElement in DOM
     */
    static closestElement(node, type) {
        const elm = Dom.up(node, elm => {
            if (elm) {
                const { component } = elm;
                return component && Component.isInstanceOf(component, type);
            }
            return false;
        });
        return elm ? elm?.component : null;
    }
    /**
     * Update UI from state
     */
    update() {
        // empty
    }
    /**
     * Append container to element
     */
    appendTo(element) {
        element.appendChild(this.container);
        return this;
    }
    /**
     * Valid name only with valid chars
     */
    clearName(name) {
        return name.replace(/[^a-zA-Z0-9]/g, '_');
    }
    /**
     * Method create only box
     */
    render(options) {
        return this.j.c.div(this.componentName);
    }
    /**
     * Create main HTML container
     */
    createContainer(options) {
        const result = this.render(options);
        if (isString(result)) {
            const elm = this.parseTemplate(result);
            elm.classList.add(this.componentName);
            return elm;
        }
        return result;
    }
    parseTemplate(result) {
        return this.j.c.fromHTML(result
            .replace(/\*([^*]+?)\*/g, (_, name) => Icon.get(name) || '')
            .replace(/&_/g, this.componentName + '_')
            .replace(/~([^~]+?)~/g, (_, s) => this.i18n(s)));
    }
    /** @override */
    constructor(jodit, options) {
        super(jodit);
        this.name = '';
        this.__parentElement = null;
        this.mods = {};
        this.container = this.createContainer(options);
        Object.defineProperty(this.container, 'component', {
            value: this,
            configurable: true
        });
    }
    /** @override */
    destruct() {
        Dom.safeRemove(this.container);
        this.parentElement = null;
        return super.destruct();
    }
};
UIElement = UIElement_1 = __decorate([
    derive(Mods, Elms)
], UIElement);
export { UIElement };
