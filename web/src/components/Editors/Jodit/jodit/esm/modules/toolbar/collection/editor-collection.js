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
import * as consts from "../../../core/constants.js";
import { component } from "../../../core/decorators/index.js";
import { Dom } from "../../../core/dom/index.js";
import { css, isFunction } from "../../../core/helpers/index.js";
import { ToolbarCollection } from "./collection.js";
let ToolbarEditorCollection = class ToolbarEditorCollection extends ToolbarCollection {
    /** @override */
    className() {
        return 'ToolbarEditorCollection';
    }
    /** @override */
    shouldBeDisabled(button) {
        const disabled = super.shouldBeDisabled(button);
        if (disabled !== undefined) {
            return disabled;
        }
        const mode = button.control.mode === undefined
            ? consts.MODE_WYSIWYG
            : button.control.mode;
        return !(mode === consts.MODE_SPLIT || mode === this.j.getRealMode());
    }
    /** @override */
    shouldBeActive(button) {
        const active = super.shouldBeActive(button);
        if (active !== undefined) {
            return active;
        }
        const element = this.j.selection ? this.j.s.current() : null;
        if (!element) {
            return false;
        }
        let elm;
        if (button.control.tags) {
            const tags = button.control.tags;
            elm = element;
            if (Dom.up(elm, (node) => {
                if (node &&
                    tags.indexOf(node.nodeName.toLowerCase()) !== -1) {
                    return true;
                }
            }, this.j.editor)) {
                return true;
            }
        }
        // activate by supposed css
        if (button.control.css) {
            const css = button.control.css;
            elm = element;
            if (Dom.up(elm, (node) => {
                if (node && !Dom.isText(node) && !Dom.isComment(node)) {
                    return this.checkActiveStatus(css, node);
                }
            }, this.j.editor)) {
                return true;
            }
        }
        return false;
    }
    /** @override */
    getTarget(button) {
        return button.target || this.j.s.current() || null;
    }
    /** @override */
    constructor(jodit) {
        super(jodit);
        this.checkActiveStatus = (cssObject, node) => {
            let matches = 0, total = 0;
            Object.keys(cssObject).forEach((cssProperty) => {
                const cssValue = cssObject[cssProperty];
                if (isFunction(cssValue)) {
                    if (cssValue(this.j, css(node, cssProperty).toString())) {
                        matches += 1;
                    }
                }
                else {
                    if (cssValue.indexOf(css(node, cssProperty).toString()) !== -1) {
                        matches += 1;
                    }
                }
                total += 1;
            });
            return total === matches;
        };
        this.prependInvisibleInput(this.container);
    }
    /**
     * Adds an invisible element to the container that can handle the
     * situation when the editor is inside the <label>
     *
     * @see https://github.com/jodit/jodit-react/issues/138
     */
    prependInvisibleInput(container) {
        const input = this.j.create.element('input', {
            tabIndex: -1,
            disabled: true, // Because <label> can trigger click
            style: 'width: 0; height:0; position: absolute; visibility: hidden;'
        });
        Dom.appendChildFirst(container, input);
    }
    /**
     * Show the inline toolbar inside WYSIWYG editor.
     * @param bound - you can set the place for displaying the toolbar,
     * or the place will be in the place of the cursor
     */
    showInline(bound) {
        this.jodit.e.fire('showInlineToolbar', bound);
    }
    hide() {
        this.jodit.e.fire('hidePopup');
        super.hide();
        this.jodit.e.fire('toggleToolbar');
    }
    show() {
        super.show();
        this.jodit.e.fire('toggleToolbar');
    }
};
ToolbarEditorCollection = __decorate([
    component
], ToolbarEditorCollection);
export { ToolbarEditorCollection };
