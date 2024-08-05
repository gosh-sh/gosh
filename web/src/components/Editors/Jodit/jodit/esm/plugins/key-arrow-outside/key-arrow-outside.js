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
import { KEY_RIGHT, NBSP_SPACE } from "../../core/constants.js";
import { watch } from "../../core/decorators/index.js";
import { Dom } from "../../core/dom/dom.js";
import { pluginSystem } from "../../core/global.js";
import { Plugin } from "../../core/plugin/index.js";
/**
 * Allowing to go outside of an inline element if there is no other element after that.
 */
export class keyArrowOutside extends Plugin {
    afterInit(jodit) { }
    beforeDestruct(jodit) { }
    onKeyDownArrow(e) {
        if (e.key !== KEY_RIGHT || !this.j.selection.isCollapsed()) {
            return;
        }
        const { endContainer, endOffset } = this.j.selection.range;
        if (!Dom.isText(endContainer)) {
            return;
        }
        if (endContainer.nodeValue?.length === endOffset) {
            const { parentNode } = endContainer;
            if (Dom.isInlineBlock(parentNode) &&
                !Dom.findNotEmptyNeighbor(parentNode, false, this.j.editor)) {
                Dom.after(parentNode, this.j.createInside.text(NBSP_SPACE));
            }
        }
    }
}
__decorate([
    watch(':keydown')
], keyArrowOutside.prototype, "onKeyDownArrow", null);
pluginSystem.add('keyArrowOutside', keyArrowOutside);
