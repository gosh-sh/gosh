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
import { component } from "../../../core/decorators/index.js";
import { Dom } from "../../../core/dom/index.js";
import { attr, isString } from "../../../core/helpers/index.js";
import { UIButton } from "../../../core/ui/button/index.js";
let ToolbarContent = class ToolbarContent extends UIButton {
    /** @override */
    className() {
        return 'ToolbarContent';
    }
    /** @override */
    update() {
        const content = this.control.getContent(this.j, this);
        if (isString(content) || content.parentNode !== this.container) {
            Dom.detach(this.container);
            this.container.appendChild(isString(content) ? this.j.create.fromHTML(content) : content);
        }
        super.update();
    }
    /** @override */
    createContainer() {
        return this.j.c.span(this.componentName);
    }
    constructor(jodit, control, target = null) {
        super(jodit);
        this.control = control;
        this.target = target;
        this.container.classList.add(`${this.componentName}_${this.clearName(control.name)}`);
        attr(this.container, 'role', 'content');
    }
};
ToolbarContent = __decorate([
    component
], ToolbarContent);
export { ToolbarContent };
