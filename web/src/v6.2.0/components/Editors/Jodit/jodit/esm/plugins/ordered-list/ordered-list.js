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
import { pluginSystem } from "../../core/global.js";
import { Plugin } from "../../core/plugin/index.js";
import "./config.js";
/**
 * Process commands insertOrderedList and insertUnOrderedList
 */
export class orderedList extends Plugin {
    constructor() {
        super(...arguments);
        this.buttons = [
            {
                name: 'ul',
                group: 'list'
            },
            {
                name: 'ol',
                group: 'list'
            }
        ];
    }
    afterInit(jodit) {
        jodit
            .registerCommand('insertUnorderedList', this.onCommand)
            .registerCommand('insertOrderedList', this.onCommand);
    }
    onCommand(command, _, type) {
        this.jodit.s.commitStyle({
            element: command === 'insertunorderedlist' ? 'ul' : 'ol',
            attributes: {
                style: {
                    listStyleType: type ?? null
                }
            }
        });
        this.jodit.synchronizeValues();
        return false;
    }
    beforeDestruct(jodit) { }
}
__decorate([
    autobind
], orderedList.prototype, "onCommand", null);
pluginSystem.add('orderedList', orderedList);
