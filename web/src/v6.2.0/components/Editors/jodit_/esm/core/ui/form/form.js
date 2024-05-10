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
import { component } from "../../decorators/component/component.js";
import { attr } from "../../helpers/utils/index.js";
import { UIInput } from "./inputs/input/input.js";
import { UISelect } from "./inputs/select/select.js";
import { UIGroup } from "../group/group.js";
let UIForm = class UIForm extends UIGroup {
    /** @override */
    className() {
        return 'UIForm';
    }
    submit() {
        this.j.e.fire(this.container, 'submit');
    }
    validate() {
        const inputs = this.allChildren.filter(elm => Component.isInstanceOf(elm, UIInput));
        for (const input of inputs) {
            if (!input.validate()) {
                return false;
            }
        }
        const selects = this.allChildren.filter(elm => Component.isInstanceOf(elm, UISelect));
        for (const select of selects) {
            if (!select.validate()) {
                return false;
            }
        }
        return true;
    }
    onSubmit(handler) {
        this.j.e.on(this.container, 'submit', () => {
            const inputs = this.allChildren.filter(elm => Component.isInstanceOf(elm, UIInput));
            if (!this.validate()) {
                return false;
            }
            handler(inputs.reduce((res, item) => {
                res[item.state.name] = item.value;
                return res;
            }, {}));
            return false;
        });
        return this;
    }
    /** @override */
    createContainer() {
        const form = this.j.c.element('form');
        form.classList.add(this.componentName);
        attr(form, 'dir', this.j.o.direction || 'auto');
        return form;
    }
    constructor(...args) {
        super(...args);
        if (this.options?.className) {
            this.container.classList.add(this.options?.className);
        }
    }
};
UIForm = __decorate([
    component
], UIForm);
export { UIForm };
