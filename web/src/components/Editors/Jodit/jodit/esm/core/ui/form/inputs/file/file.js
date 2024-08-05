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
import { component } from "../../../../decorators/component/component.js";
import { UIButton } from "../../../button/button/button.js";
import { UIInput } from "../input/input.js";
let UIFileInput = class UIFileInput extends UIInput {
    /** @override */
    className() {
        return 'UIFileInput';
    }
    createContainer(options) {
        this.button = new UIButton(this.j, {
            icon: {
                name: 'plus'
            }
        });
        const { container } = this.button;
        if (!this.nativeInput) {
            this.nativeInput = this.createNativeInput(options);
        }
        const { nativeInput } = this;
        nativeInput.classList.add(this.getFullElName('input'));
        container.classList.add(this.componentName);
        container.appendChild(nativeInput);
        return container;
    }
    createNativeInput(options) {
        return this.j.create.fromHTML(`<input
			type="file"
			accept="${options.onlyImages ? 'image/*' : '*'}"
			tabindex="-1"
			dir="auto"
			multiple=""
		/>`);
    }
    constructor(jodit, options) {
        super(jodit, {
            type: 'file',
            ...options
        });
        this.state = {
            ...UIInput.defaultState,
            type: 'file',
            onlyImages: true
        };
    }
};
UIFileInput = __decorate([
    component
], UIFileInput);
export { UIFileInput };
