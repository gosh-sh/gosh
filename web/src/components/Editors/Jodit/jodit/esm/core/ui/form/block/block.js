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
import { attr } from "../../../helpers/utils/index.js";
import { UIGroup } from "../../group/group.js";
let UIBlock = class UIBlock extends UIGroup {
    /** @override */
    className() {
        return 'UIBlock';
    }
    constructor(jodit, elements, options = {
        align: 'left'
    }) {
        super(jodit, elements);
        this.options = options;
        this.setMod('align', this.options.align || 'left');
        this.setMod('width', this.options.width || '');
        this.options.mod && this.setMod(this.options.mod, true);
        this.options.className &&
            this.container.classList.add(this.options.className);
        attr(this.container, 'data-ref', options.ref);
        attr(this.container, 'ref', options.ref);
    }
};
UIBlock = __decorate([
    component
], UIBlock);
export { UIBlock };
