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
import { component } from "../../core/decorators/component/component.js";
import { isArray } from "../../core/helpers/checker/is-array.js";
import { Button } from "../../core/ui/button/button/button.js";
import { Popup } from "../../core/ui/popup/popup.js";
/**
 * Module to generate context menu
 */
let ContextMenu = class ContextMenu extends Popup {
    /** @override */
    className() {
        return 'ContextMenu';
    }
    /**
     * Generate and show context menu
     *
     * @param x - Global coordinate by X
     * @param y - Global coordinate by Y
     * @param actions - Array with plain objects `{icon: 'bin', title: 'Delete', exec: function () {}}`
     * @example
     * ```javascript
     * parent.show(e.clientX, e.clientY, [{icon: 'bin', title: 'Delete', exec: function () { alert(1) }}]);
     * ```
     */
    show(x, y, actions) {
        const self = this;
        self.clear();
        if (!isArray(actions)) {
            return;
        }
        actions.forEach(item => {
            if (!item) {
                return;
            }
            const action = Button(this.jodit, item.icon || 'empty', item.title);
            this.jodit && action.setParentView(this.jodit);
            action.setMod('context', 'menu');
            action.onAction((e) => {
                item.exec?.call(self, e);
                self.clear();
                self.close();
                return false;
            });
            this.append(action);
        });
        this.open(() => ({ left: x, top: y, width: 0, height: 0 }), true);
    }
};
ContextMenu = __decorate([
    component
], ContextMenu);
export { ContextMenu };
