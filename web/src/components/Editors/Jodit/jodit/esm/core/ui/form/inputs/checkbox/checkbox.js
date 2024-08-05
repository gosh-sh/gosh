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
var UICheckbox_1;
import { component, hook, watch } from "../../../../decorators/index.js";
import { Dom } from "../../../../dom/dom.js";
import { UIInput } from "../input/input.js";
let UICheckbox = UICheckbox_1 = class UICheckbox extends UIInput {
    /** @override */
    className() {
        return 'UICheckbox';
    }
    /** @override */
    render() {
        return this.j.c.element('label', {
            className: this.componentName
        });
    }
    /** @override **/
    constructor(jodit, options) {
        super(jodit, { ...options, type: 'checkbox' });
        /** @override */
        this.state = { ...UICheckbox_1.defaultState };
        Object.assign(this.state, options);
    }
    onChangeChecked() {
        this.value = this.state.checked.toString();
        this.nativeInput.checked = this.state.checked;
        this.setMod('checked', this.state.checked);
    }
    onChangeNativeCheckBox() {
        this.state.checked = this.nativeInput.checked;
    }
    onChangeSwitch() {
        this.setMod('switch', this.state.switch);
        let slider = this.getElm('switch-slider');
        if (this.state.switch) {
            if (!slider) {
                slider = this.j.c.div(this.getFullElName('switch-slider'));
            }
            Dom.after(this.nativeInput, slider);
        }
        else {
            Dom.safeRemove(slider);
        }
    }
};
/** @override */
UICheckbox.defaultState = {
    ...UIInput.defaultState,
    checked: false,
    switch: false
};
__decorate([
    watch('state.checked'),
    hook('ready')
], UICheckbox.prototype, "onChangeChecked", null);
__decorate([
    watch('nativeInput:change')
], UICheckbox.prototype, "onChangeNativeCheckBox", null);
__decorate([
    watch('state.switch'),
    hook('ready')
], UICheckbox.prototype, "onChangeSwitch", null);
UICheckbox = UICheckbox_1 = __decorate([
    component
], UICheckbox);
export { UICheckbox };
