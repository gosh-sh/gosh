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
import { component } from "../../../decorators/component/component.js";
import { assert } from "../../../helpers/utils/assert.js";
import { UIButton } from "../button/button.js";
import { UIGroup } from "../../group/group.js";
let UIButtonGroup = class UIButtonGroup extends UIGroup {
    /** @override */
    className() {
        return 'UIButtonGroup';
    }
    /** @override */
    render(options) {
        return `<div>
			<div class="&__label">~${options.label}~</div>
			<div class="&__options"></div>
		</div>`;
    }
    /** @override */
    appendChildToContainer(childContainer) {
        const options = this.getElm('options');
        assert(options != null, 'Options does not exist');
        options.appendChild(childContainer);
    }
    constructor(jodit, options = {
        radio: true
    }) {
        super(jodit, options.options?.map(opt => {
            const btn = new UIButton(jodit, {
                text: opt.text,
                value: opt.value,
                variant: 'primary'
            });
            btn.onAction(() => {
                this.select(opt.value);
            });
            return btn;
        }), options);
        this.options = options;
        this.select(options.value ?? 0);
    }
    select(indexOrValue) {
        this.elements.forEach((elm, index) => {
            if (index === indexOrValue || elm.state.value === indexOrValue) {
                elm.state.activated = true;
            }
            else if (this.options.radio) {
                elm.state.activated = false;
            }
        });
        const result = this.elements
            .filter(elm => elm.state.activated)
            .map(elm => ({
            text: elm.state.text,
            value: elm.state.value
        }));
        this.jodit.e.fire(this, 'select', result);
        this.options.onChange?.(result);
    }
};
UIButtonGroup = __decorate([
    component
], UIButtonGroup);
export { UIButtonGroup };
