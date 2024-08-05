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
var UITextArea_1;
import { watch } from "../../../../decorators/index.js";
import { component } from "../../../../decorators/component/component.js";
import { UIInput } from "../input/input.js";
let UITextArea = UITextArea_1 = class UITextArea extends UIInput {
    /** @override */
    className() {
        return 'UITextArea';
    }
    createNativeInput(options) {
        return this.j.create.element('textarea');
    }
    constructor(jodit, state) {
        super(jodit, state);
        /** @override */
        this.state = { ...UITextArea_1.defaultState };
        Object.assign(this.state, state);
        if (this.state.resizable === false) {
            this.nativeInput.style.resize = 'none';
        }
    }
    onChangeStateSize() {
        const { size, resizable } = this.state;
        this.nativeInput.style.resize = resizable ? 'auto' : 'none';
        this.nativeInput.rows = size ?? 5;
    }
};
/** @override */
UITextArea.defaultState = {
    ...UIInput.defaultState,
    size: 5,
    resizable: true
};
__decorate([
    watch(['state.size', 'state.resizable'])
], UITextArea.prototype, "onChangeStateSize", null);
UITextArea = UITextArea_1 = __decorate([
    component
], UITextArea);
export { UITextArea };
