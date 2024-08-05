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
import { Dom } from "../../core/dom/index.js";
import { pluginSystem } from "../../core/global.js";
import { Plugin } from "../../core/plugin/index.js";
import { Icon } from "../../core/ui/index.js";
import "./config.js";
let resizeHandler = class resizeHandler extends Plugin {
    constructor() {
        super(...arguments);
        /**
         * Plugin in resize process
         */
        this.isResized = false;
        /**
         * Start point
         */
        this.start = {
            x: 0,
            y: 0,
            w: 0,
            h: 0
        };
        /**
         * Resize handle
         */
        this.handle = this.j.c.div('jodit-editor__resize', Icon.get('resize_handler'));
    }
    /** @override **/
    afterInit(editor) {
        const { height, width, allowResizeX } = editor.o;
        let { allowResizeY } = editor.o;
        if (height === 'auto' && width !== 'auto') {
            allowResizeY = false;
        }
        if ((height !== 'auto' || width !== 'auto') &&
            (allowResizeX || allowResizeY)) {
            editor.statusbar.setMod('resize-handle', true);
            editor.e
                .on('toggleFullSize.resizeHandler', () => {
                this.handle.style.display = editor.isFullSize
                    ? 'none'
                    : 'block';
            })
                .on(this.handle, 'mousedown touchstart', this.onHandleResizeStart)
                .on(editor.ow, 'mouseup touchend', this.onHandleResizeEnd);
            editor.container.appendChild(this.handle);
        }
    }
    /**
     * Handler: Click on handle - start resizing
     */
    onHandleResizeStart(e) {
        this.isResized = true;
        this.start.x = e.clientX;
        this.start.y = e.clientY;
        this.start.w = this.j.container.offsetWidth;
        this.start.h = this.j.container.offsetHeight;
        this.j.lock();
        this.j.e.on(this.j.ow, 'mousemove touchmove', this.onHandleResize);
        e.preventDefault();
    }
    /**
     * Handler: Mouse move after start resizing
     */
    onHandleResize(e) {
        if (!this.isResized) {
            return;
        }
        if (this.j.o.allowResizeY) {
            this.j.e.fire('setHeight', this.start.h + e.clientY - this.start.y);
        }
        if (this.j.o.allowResizeX) {
            this.j.e.fire('setWidth', this.start.w + e.clientX - this.start.x);
        }
        this.j.e.fire('resize');
    }
    /**
     * End of resizing
     */
    onHandleResizeEnd() {
        if (this.isResized) {
            this.isResized = false;
            this.j.e.off(this.j.ow, 'mousemove touchmove', this.onHandleResize);
            this.j.unlock();
        }
    }
    /** @override **/
    beforeDestruct() {
        Dom.safeRemove(this.handle);
        this.j.e.off(this.j.ow, 'mouseup touchsend', this.onHandleResizeEnd);
    }
};
/** @override **/
resizeHandler.requires = ['size'];
resizeHandler = __decorate([
    autobind
], resizeHandler);
export { resizeHandler };
pluginSystem.add('resizeHandler', resizeHandler);
