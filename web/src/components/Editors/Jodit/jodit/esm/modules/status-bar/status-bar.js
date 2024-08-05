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
import { STATUSES, ViewComponent } from "../../core/component/index.js";
import { component, derive } from "../../core/decorators/index.js";
import { Dom } from "../../core/dom/dom.js";
import { Elms } from "../../core/traits/elms.js";
import { Mods } from "../../core/traits/mods.js";
let StatusBar = class StatusBar extends ViewComponent {
    className() {
        return 'StatusBar';
    }
    /**
     * Hide statusbar
     */
    hide() {
        this.container.classList.add('jodit_hidden');
    }
    /**
     * Show statusbar
     */
    show() {
        this.container.classList.remove('jodit_hidden');
    }
    /**
     * Status bar is shown
     */
    get isShown() {
        return !this.container.classList.contains('jodit_hidden');
    }
    /**
     * Height of statusbar
     */
    getHeight() {
        return this.container?.offsetHeight ?? 0;
    }
    findEmpty(inTheRight = false) {
        const items = this.getElms(inTheRight ? 'item-right' : 'item');
        for (let i = 0; i < items.length; i += 1) {
            if (!items[i].innerHTML.trim().length) {
                return items[i];
            }
        }
        return;
    }
    /**
     * Add element in statusbar
     */
    append(child, inTheRight = false) {
        const wrapper = this.findEmpty(inTheRight) ||
            this.j.c.div(this.getFullElName('item'));
        if (inTheRight) {
            wrapper.classList.add(this.getFullElName('item-right'));
        }
        wrapper.appendChild(child);
        this.container?.appendChild(wrapper);
        if (this.j.o.statusbar) {
            this.show();
        }
        this.j.e.fire('resize');
    }
    constructor(jodit, target) {
        super(jodit);
        this.target = target;
        this.mods = {};
        this.container = jodit.c.div('jodit-status-bar');
        target.appendChild(this.container);
        this.hide();
    }
    destruct() {
        if (this.isInDestruct) {
            return;
        }
        this.setStatus(STATUSES.beforeDestruct);
        Dom.safeRemove(this.container);
        super.destruct();
    }
};
StatusBar = __decorate([
    component,
    derive(Mods, Elms)
], StatusBar);
export { StatusBar };
