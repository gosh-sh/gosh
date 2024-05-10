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
import { autobind } from "../../core/decorators/index.js";
import { Dom } from "../../core/dom/dom.js";
import { extendLang, pluginSystem } from "../../core/global.js";
import { css } from "../../core/helpers/index.js";
import { Plugin } from "../../core/plugin/index.js";
import "./config.js";
import * as langs from "./langs/index.js";
export class lineHeight extends Plugin {
    constructor(jodit) {
        super(jodit);
        this.buttons = [
            {
                name: 'lineHeight',
                group: 'font'
            }
        ];
        extendLang(langs);
    }
    afterInit(jodit) {
        css(jodit.editor, {
            lineHeight: jodit.o.defaultLineHeight
        });
        jodit.registerCommand('applyLineHeight', this.applyLineHeight);
    }
    applyLineHeight(ignore, ignoreA, value) {
        const { s, createInside: c, editor: root, o } = this.j;
        if (!s.isFocused()) {
            s.focus();
        }
        s.save();
        let addStyle;
        const apply = (node) => {
            let parentBlock = Dom.closest(node, Dom.isBlock, root);
            if (!parentBlock) {
                parentBlock = Dom.wrap(node, o.enter, c);
            }
            const previousValue = css(parentBlock, 'lineHeight');
            if (addStyle === undefined) {
                addStyle = previousValue.toString() !== value.toString();
            }
            css(parentBlock, 'lineHeight', addStyle ? value : null);
        };
        try {
            if (s.isCollapsed()) {
                const fake = c.fake();
                s.insertNode(fake, false, false);
                apply(fake);
                Dom.safeRemove(fake);
            }
            else {
                s.eachSelection(apply);
            }
        }
        finally {
            s.restore();
        }
    }
    beforeDestruct(jodit) {
        css(jodit.editor, {
            lineHeight: null
        });
    }
}
__decorate([
    autobind
], lineHeight.prototype, "applyLineHeight", null);
pluginSystem.add('lineHeight', lineHeight);
