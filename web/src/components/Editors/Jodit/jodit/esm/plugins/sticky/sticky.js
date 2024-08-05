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
import { IS_ES_NEXT, IS_IE, MODE_WYSIWYG } from "../../core/constants.js";
import { throttle } from "../../core/decorators/index.js";
import { Dom } from "../../core/dom/dom.js";
import { pluginSystem } from "../../core/global.js";
import { css, offset } from "../../core/helpers/index.js";
import { Plugin } from "../../core/plugin/plugin.js";
import "./config.js";
const NEED_DUMMY_BOX = !IS_ES_NEXT && IS_IE;
export class sticky extends Plugin {
    constructor() {
        super(...arguments);
        this.__isToolbarStuck = false;
        this.__createDummy = (toolbar) => {
            this.__dummyBox = this.j.c.div();
            this.__dummyBox.classList.add('jodit_sticky-dummy_toolbar');
            this.j.container.insertBefore(this.__dummyBox, toolbar);
        };
        /**
         * Add sticky
         */
        this.addSticky = (toolbar) => {
            if (!this.__isToolbarStuck) {
                if (NEED_DUMMY_BOX && !this.__dummyBox) {
                    this.__createDummy(toolbar);
                }
                this.j.container.classList.add('jodit_sticky');
                this.__isToolbarStuck = true;
            }
            // on resize, it should work always
            css(toolbar, {
                top: this.j.o.toolbarStickyOffset || null,
                width: this.j.container.offsetWidth - 2
            });
            this.__dummyBox &&
                css(this.__dummyBox, {
                    height: toolbar.offsetHeight
                });
        };
        /**
         * Remove sticky behaviour
         */
        this.removeSticky = (toolbar) => {
            if (!this.__isToolbarStuck) {
                return;
            }
            css(toolbar, {
                width: '',
                top: ''
            });
            this.j.container.classList.remove('jodit_sticky');
            this.__isToolbarStuck = false;
        };
    }
    afterInit(jodit) {
        jodit.e
            .on(jodit.ow, 'scroll.sticky wheel.sticky mousewheel.sticky resize.sticky', this.__onScroll)
            .on('getStickyState.sticky', () => this.__isToolbarStuck);
    }
    /**
     * Scroll handler
     */
    __onScroll() {
        const { jodit } = this;
        if (!jodit.o.toolbarSticky || !jodit.o.toolbar) {
            return;
        }
        const scrollWindowTop = jodit.ow.pageYOffset ||
            (jodit.od.documentElement && jodit.od.documentElement.scrollTop) ||
            0;
        const offsetEditor = offset(jodit.container, jodit, jodit.od, true);
        const doSticky = jodit.getMode() === MODE_WYSIWYG &&
            scrollWindowTop + jodit.o.toolbarStickyOffset > offsetEditor.top &&
            scrollWindowTop + jodit.o.toolbarStickyOffset <
                offsetEditor.top + offsetEditor.height &&
            !(jodit.o.toolbarDisableStickyForMobile && this.__isMobile());
        if (this.__isToolbarStuck === doSticky) {
            return;
        }
        const container = jodit.toolbarContainer;
        if (container) {
            doSticky ? this.addSticky(container) : this.removeSticky(container);
        }
        jodit.e.fire('toggleSticky', doSticky);
    }
    /**
     * Is mobile device
     */
    __isMobile() {
        const { j } = this;
        return (j &&
            j.options &&
            j.container &&
            j.options.sizeSM >= j.container.offsetWidth);
    }
    beforeDestruct(jodit) {
        Dom.safeRemove(this.__dummyBox);
        jodit.e
            .off(jodit.ow, 'scroll.sticky wheel.sticky mousewheel.sticky resize.sticky', this.__onScroll)
            .off('.sticky');
    }
}
__decorate([
    throttle()
], sticky.prototype, "__onScroll", null);
pluginSystem.add('sticky', sticky);
