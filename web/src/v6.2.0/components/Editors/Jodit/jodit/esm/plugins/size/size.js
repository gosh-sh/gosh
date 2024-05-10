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
import { autobind, throttle } from "../../core/decorators/index.js";
import { pluginSystem } from "../../core/global.js";
import { isNumber } from "../../core/helpers/checker/is-number.js";
import { css } from "../../core/helpers/utils/css.js";
import { Plugin } from "../../core/plugin/plugin.js";
import "./config.js";
/**
 * Calculate sizes for editor workspace and handle setHeight and setWidth events
 */
let size = class size extends Plugin {
    constructor() {
        super(...arguments);
        /**
         * Debounced wrapper for resizeWorkspaceImd
         */
        this.__resizeWorkspaces = this.j.async.debounce(this.__resizeWorkspaceImd, this.j.defaultTimeout, true);
    }
    afterInit(editor) {
        editor.e
            .on('setHeight.size', this.__setHeight)
            .on('setWidth.size', this.__setWidth)
            .on('afterInit.size changePlace.size', this.__initialize, {
            top: true
        })
            .on(editor.ow, 'load.size', this.__resizeWorkspaces)
            .on('afterInit.size resize.size afterUpdateToolbar.size ' +
            'scroll.size afterResize.size', this.__resizeWorkspaces)
            .on('toggleFullSize.size toggleToolbar.size', this.__resizeWorkspaceImd);
        this.__initialize();
    }
    /**
     * Set editor size by options
     */
    __initialize() {
        const { j } = this;
        if (j.o.inline) {
            return;
        }
        let { height } = j.o;
        if (j.o.saveHeightInStorage && height !== 'auto') {
            const localHeight = j.storage.get('height');
            if (localHeight) {
                height = localHeight;
            }
        }
        css(j.editor, {
            minHeight: '100%'
        });
        css(j.container, {
            minHeight: j.o.minHeight,
            maxHeight: j.o.maxHeight,
            minWidth: j.o.minWidth,
            maxWidth: j.o.maxWidth
        });
        if (!j.isFullSize) {
            this.__setHeight(height);
            this.__setWidth(j.o.width);
        }
    }
    /**
     * Manually change height
     */
    __setHeight(height) {
        if (isNumber(height)) {
            const { minHeight, maxHeight } = this.j.o;
            if (isNumber(minHeight) && minHeight > height) {
                height = minHeight;
            }
            if (isNumber(maxHeight) && maxHeight < height) {
                height = maxHeight;
            }
        }
        css(this.j.container, 'height', height);
        if (this.j.o.saveHeightInStorage) {
            this.j.storage.set('height', height);
        }
        this.__resizeWorkspaceImd();
    }
    /**
     * Manually change width
     */
    __setWidth(width) {
        if (isNumber(width)) {
            const { minWidth, maxWidth } = this.j.o;
            if (isNumber(minWidth) && minWidth > width) {
                width = minWidth;
            }
            if (isNumber(maxWidth) && maxWidth < width) {
                width = maxWidth;
            }
        }
        css(this.j.container, 'width', width);
        this.__resizeWorkspaceImd();
    }
    /**
     * Returns service spaces: toolbar + statusbar
     */
    __getNotWorkHeight() {
        return ((this.j.toolbarContainer?.offsetHeight || 0) +
            (this.j.statusbar?.getHeight() || 0) +
            2);
    }
    /**
     * Calculate workspace height
     */
    __resizeWorkspaceImd() {
        if (!this.j || this.j.isDestructed || !this.j.o || this.j.o.inline) {
            return;
        }
        if (!this.j.container || !this.j.container.parentNode) {
            return;
        }
        const minHeight = (css(this.j.container, 'minHeight') || 0) -
            this.__getNotWorkHeight();
        if (isNumber(minHeight) && minHeight > 0) {
            [this.j.workplace, this.j.iframe, this.j.editor].map(elm => {
                elm && css(elm, 'minHeight', minHeight);
            });
            this.j.e.fire('setMinHeight', minHeight);
        }
        if (isNumber(this.j.o.maxHeight)) {
            const maxHeight = this.j.o.maxHeight - this.__getNotWorkHeight();
            [this.j.workplace, this.j.iframe, this.j.editor].map(elm => {
                elm && css(elm, 'maxHeight', maxHeight);
            });
            this.j.e.fire('setMaxHeight', maxHeight);
        }
        if (this.j.container) {
            css(this.j.workplace, 'height', this.j.o.height !== 'auto' || this.j.isFullSize
                ? this.j.container.offsetHeight - this.__getNotWorkHeight()
                : 'auto');
        }
    }
    /** @override **/
    beforeDestruct(jodit) {
        jodit.e
            .off(jodit.ow, 'load.size', this.__resizeWorkspaces)
            .off('.size');
    }
};
__decorate([
    throttle()
], size.prototype, "__initialize", null);
__decorate([
    autobind
], size.prototype, "__resizeWorkspaceImd", null);
size = __decorate([
    autobind
], size);
export { size };
pluginSystem.add('size', size);
