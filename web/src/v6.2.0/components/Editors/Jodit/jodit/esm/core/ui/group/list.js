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
import { Component } from "../../component/component.js";
import { component, hook, watch } from "../../decorators/index.js";
import { splitArray } from "../../helpers/array/split-array.js";
import { UIButton } from "../button/button/button.js";
import { UIGroup } from "./group.js";
import { UISeparator } from "./separator.js";
import { UISpacer } from "./spacer.js";
import { isButtonGroup } from "../helpers/buttons.js";
import { getControlType } from "../helpers/get-control-type.js";
import { getStrongControlTypes } from "../helpers/get-strong-control-types.js";
let UIList = class UIList extends UIGroup {
    /** @override */
    className() {
        return 'UIList';
    }
    __onChangeMode() {
        this.setMod('mode', this.mode);
    }
    constructor(jodit) {
        super(jodit);
        this.mode = 'horizontal';
        this.removeButtons = [];
    }
    /**
     * Make new group and append it in list of elements
     */
    makeGroup() {
        return new UIGroup(this.jodit);
    }
    /**
     * All buttons from list
     */
    get buttons() {
        return this.allChildren.filter(elm => Component.isInstanceOf(elm, UIButton));
    }
    /**
     * Helper for getting full plain button list
     */
    getButtonsNames() {
        return this.buttons
            .map(a => (a instanceof UIButton && a.state.name) || '')
            .filter(a => a !== '');
    }
    setRemoveButtons(removeButtons) {
        this.removeButtons = removeButtons || [];
        return this;
    }
    build(items, target = null) {
        items = splitArray(items);
        this.clear();
        let lastBtnSeparator = false;
        let line = this.makeGroup();
        this.append(line);
        line.setMod('line', true);
        let group;
        const addButton = (control) => {
            let elm = null;
            switch (control.name) {
                case '\n':
                    line = this.makeGroup();
                    line.setMod('line', true);
                    group = this.makeGroup();
                    line.append(group);
                    this.append(line);
                    break;
                case '|':
                    if (!lastBtnSeparator) {
                        lastBtnSeparator = true;
                        elm = new UISeparator(this.j);
                    }
                    break;
                case '---': {
                    group.setMod('before-spacer', true);
                    const space = new UISpacer(this.j);
                    line.append(space);
                    group = this.makeGroup();
                    line.append(group);
                    lastBtnSeparator = false;
                    break;
                }
                default:
                    lastBtnSeparator = false;
                    switch (control.component) {
                        case 'select':
                            elm = this.makeSelect(control, target);
                            break;
                        case 'button':
                        default:
                            elm = this.makeButton(control, target);
                    }
            }
            if (elm) {
                if (!group) {
                    group = this.makeGroup();
                    line.append(group);
                }
                group.append(elm);
            }
        };
        const isNotRemoved = (b) => !this.removeButtons.includes(b.name) &&
            (!b.isVisible || b.isVisible?.(this.j, b));
        items.forEach(item => {
            if (isButtonGroup(item)) {
                const buttons = item.buttons.filter(b => b);
                if (buttons.length) {
                    group = this.makeGroup();
                    group.setMod('separated', true).setMod('group', item.group);
                    line.append(group);
                    getStrongControlTypes(buttons, this.j.o.controls)
                        .filter(isNotRemoved)
                        .forEach(addButton);
                }
            }
            else {
                if (!group) {
                    group = this.makeGroup();
                    line.append(group);
                }
                const control = getControlType(item, this.j.o.controls);
                isNotRemoved(control) && addButton(control);
            }
        });
        this.update();
        return this;
    }
    makeSelect(control, target) {
        throw new Error('Not implemented behaviour');
    }
    /**
     * Create button instance
     */
    makeButton(control, target) {
        return new UIButton(this.j, {
            name: control.name
        });
    }
};
__decorate([
    watch('mode'),
    hook('ready')
], UIList.prototype, "__onChangeMode", null);
UIList = __decorate([
    component
], UIList);
export { UIList };
