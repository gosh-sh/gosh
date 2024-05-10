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
var UIGroup_1;
import { Component } from "../../component/component.js";
import { component, watch } from "../../decorators/index.js";
import { Dom } from "../../dom/dom.js";
import { isArray } from "../../helpers/index.js";
import { assert } from "../../helpers/utils/assert.js";
import { UIElement } from "../element.js";
let UIGroup = UIGroup_1 = class UIGroup extends UIElement {
    className() {
        return 'UIGroup';
    }
    /**
     * All group children
     */
    get allChildren() {
        const result = [];
        const stack = [
            ...this.elements
        ];
        while (stack.length) {
            const elm = stack.shift();
            if (isArray(elm)) {
                stack.push(...elm);
            }
            else if (Component.isInstanceOf(elm, UIGroup_1)) {
                stack.push(...elm.elements);
            }
            else {
                elm && result.push(elm);
            }
        }
        return result;
    }
    /**
     * Update all children
     */
    update() {
        this.elements.forEach(elm => elm.update());
        this.setMod('size', this.buttonSize);
    }
    /**
     * Append new element into group
     */
    append(elm, distElement) {
        if (isArray(elm)) {
            elm.forEach(item => this.append(item, distElement));
            return this;
        }
        this.elements.push(elm);
        if (elm.name) {
            elm.container.classList.add(this.getFullElName(elm.name));
        }
        if (distElement) {
            const distElm = this.getElm(distElement);
            assert(distElm != null, 'Element does not exist');
            distElm.appendChild(elm.container);
        }
        else {
            this.appendChildToContainer(elm.container);
        }
        elm.parentElement = this;
        return this;
    }
    /** @override */
    afterSetMod(name, value) {
        if (this.syncMod) {
            this.elements.forEach(elm => elm.setMod(name, value));
        }
    }
    /**
     * Allow set another container for the box of all children
     */
    appendChildToContainer(childContainer) {
        this.container.appendChild(childContainer);
    }
    /**
     * Remove element from group
     */
    remove(elm) {
        const index = this.elements.indexOf(elm);
        if (index !== -1) {
            this.elements.splice(index, 1);
            Dom.safeRemove(elm.container);
            elm.parentElement = null;
        }
        return this;
    }
    /**
     * Clear group
     */
    clear() {
        this.elements.forEach(elm => elm.destruct());
        this.elements.length = 0;
        return this;
    }
    /**
     * @param elements - Items of group
     */
    constructor(jodit, elements, options) {
        super(jodit, options);
        this.options = options;
        /**
         * Synchronize mods to all children
         */
        this.syncMod = false;
        this.elements = [];
        this.buttonSize = 'middle';
        elements?.forEach(elm => elm && this.append(elm));
        if (options?.name) {
            this.name = options.name;
        }
    }
    /** @override */
    destruct() {
        this.clear();
        return super.destruct();
    }
};
__decorate([
    watch('buttonSize')
], UIGroup.prototype, "update", null);
UIGroup = UIGroup_1 = __decorate([
    component
], UIGroup);
export { UIGroup };
