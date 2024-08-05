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
import { component } from "../../../../core/decorators/index.js";
import { isString } from "../../../../core/helpers/checker/is-string.js";
import { ToolbarButton } from "../button.js";
let ToolbarSelect = class ToolbarSelect extends ToolbarButton {
    className() {
        return 'ToolbarSelect';
    }
    update() {
        super.update();
        this.state.icon.name = '';
        const { list, data } = this.control;
        if (list) {
            let key = this.state.value ||
                (data && isString(data.currentValue)
                    ? data.currentValue
                    : undefined);
            if (!key) {
                const keys = Object.keys(list);
                key = keys[0];
            }
            const text = (list[key.toString()] || key).toString();
            this.state.text =
                this.control.textTemplate?.(this.jodit, text) ?? text;
        }
    }
};
ToolbarSelect = __decorate([
    component
], ToolbarSelect);
export { ToolbarSelect };
