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
var UISelect_1;
import { component } from "../../../../decorators/component/component.js";
import { attr } from "../../../../helpers/utils/attr.js";
import { UIInput } from "../input/input.js";
import { inputValidators, selectValidators } from "../../validators/index.js";
let UISelect = UISelect_1 = class UISelect extends UIInput {
    /** @override */
    className() {
        return 'UISelect';
    }
    /** @override **/
    createContainer(state) {
        const container = super.createContainer(state);
        const { j } = this, { nativeInput } = this;
        const opt = () => j.create.element('option');
        if (state.placeholder !== undefined) {
            const option = opt();
            option.value = '';
            option.text = j.i18n(state.placeholder);
            nativeInput.add(option);
        }
        state.options?.forEach(element => {
            const option = opt();
            option.value = element.value.toString();
            option.text = j.i18n(element.text);
            nativeInput.add(option);
        });
        if (state.size && state.size > 0) {
            attr(nativeInput, 'size', state.size);
        }
        if (state.multiple) {
            attr(nativeInput, 'multiple', '');
        }
        return container;
    }
    /** @override **/
    createNativeInput() {
        return this.j.create.element('select');
    }
    /** @override **/
    updateValidators() {
        super.updateValidators();
        if (this.state.required) {
            this.validators.delete(inputValidators.required);
            this.validators.add(selectValidators.required);
        }
    }
    constructor(jodit, state) {
        super(jodit, state);
        /** @override */
        this.state = { ...UISelect_1.defaultState };
        Object.assign(this.state, state);
    }
};
/** @override */
UISelect.defaultState = {
    ...UIInput.defaultState,
    options: [],
    size: 1,
    multiple: false
};
UISelect = UISelect_1 = __decorate([
    component
], UISelect);
export { UISelect };
