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
import { STATUSES, ViewComponent } from "../component/index.js";
import { autobind } from "../decorators/index.js";
import { isJoditObject } from "../helpers/checker/is-jodit-object.js";
export class Plugin extends ViewComponent {
    /** @override */
    className() {
        return 'Plugin';
    }
    constructor(jodit) {
        super(jodit);
        /** @override */
        this.buttons = [];
        /**
         * Plugin have CSS style and it should be loaded
         */
        this.hasStyle = false;
        this.__inited = false;
        jodit.e
            .on('afterPluginSystemInit', this.__afterPluginSystemInit)
            .on('afterInit', this.__afterInit)
            .on('beforeDestruct', this.__beforeDestruct);
    }
    __afterPluginSystemInit() {
        const { j, buttons } = this;
        if (buttons && isJoditObject(j)) {
            buttons.forEach(btn => {
                j.registerButton(btn);
            });
        }
    }
    __afterInit() {
        this.__inited = true;
        this.setStatus(STATUSES.ready);
        this.afterInit(this.jodit);
    }
    init(jodit) {
        if (this.jodit.isReady) {
            this.afterInit(this.jodit);
            this.__afterPluginSystemInit();
            this.jodit.e.fire('rebuildToolbar');
        }
    }
    __beforeDestruct() {
        if (this.isInDestruct) {
            return;
        }
        const { j } = this;
        j.e
            .off('afterPluginSystemInit', this.__afterPluginSystemInit)
            .off('afterInit', this.__afterInit)
            .off('beforeDestruct', this.destruct);
        this.setStatus(STATUSES.beforeDestruct);
        if (!this.__inited) {
            return super.destruct();
        }
        if (isJoditObject(j)) {
            this.buttons?.forEach(btn => {
                j?.unregisterButton(btn);
            });
        }
        this.beforeDestruct(this.j);
        super.destruct();
    }
}
Plugin.requires = [];
__decorate([
    autobind
], Plugin.prototype, "__afterPluginSystemInit", null);
__decorate([
    autobind
], Plugin.prototype, "__afterInit", null);
__decorate([
    autobind
], Plugin.prototype, "__beforeDestruct", null);
