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
import { extendLang, pluginSystem } from "../../core/global.js";
import { attr } from "../../core/helpers/utils/attr.js";
import { Plugin } from "../../core/plugin/index.js";
import "./config.js";
import * as langs from "./langs/index.js";
export class spellcheck extends Plugin {
    constructor(jodit) {
        super(jodit);
        this.buttons = [
            {
                group: 'state',
                name: 'spellcheck'
            }
        ];
        extendLang(langs);
    }
    afterInit(jodit) {
        jodit.e.on('afterInit afterAddPlace prepareWYSIWYGEditor', this.toggleSpellcheck);
        this.toggleSpellcheck();
        jodit.registerCommand('toggleSpellcheck', () => {
            this.jodit.o.spellcheck = !this.jodit.o.spellcheck;
            this.toggleSpellcheck();
            this.j.e.fire('updateToolbar');
        });
    }
    toggleSpellcheck() {
        attr(this.jodit.editor, 'spellcheck', this.jodit.o.spellcheck);
    }
    beforeDestruct(jodit) { }
}
__decorate([
    autobind
], spellcheck.prototype, "toggleSpellcheck", null);
pluginSystem.add('spellcheck', spellcheck);
