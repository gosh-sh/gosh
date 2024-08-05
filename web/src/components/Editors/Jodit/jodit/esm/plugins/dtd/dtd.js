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
import { watch } from "../../core/decorators/watch/watch.js";
import { pluginSystem } from "../../core/global.js";
import { Plugin } from "../../core/plugin/index.js";
import "./config.js";
import * as afterInsertCases from "./after-insert/index.js";
import * as beforeInsertCases from "./before-insert/index.js";
class dtd extends Plugin {
    afterInit(jodit) { }
    beforeDestruct(jodit) { }
    __onBeforeInsertNode(node) {
        const casesKeys = Object.keys(beforeInsertCases);
        casesKeys.forEach(key => {
            beforeInsertCases[key](this.j, node);
        });
    }
    __onAfterInsertNode(node) {
        const casesKeys = Object.keys(afterInsertCases);
        casesKeys.forEach(key => {
            afterInsertCases[key](this.j, node);
        });
    }
}
__decorate([
    watch(':beforeInsertNode')
], dtd.prototype, "__onBeforeInsertNode", null);
__decorate([
    watch(':afterInsertNode')
], dtd.prototype, "__onAfterInsertNode", null);
pluginSystem.add('dtd', dtd);
