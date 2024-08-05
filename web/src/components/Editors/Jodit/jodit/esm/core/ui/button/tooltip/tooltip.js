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
var UITooltip_1;
import { STATUSES } from "../../../component/index.js";
import { autobind, component } from "../../../decorators/index.js";
import { Dom } from "../../../dom/index.js";
import { getContainer } from "../../../global.js";
import { position } from "../../../helpers/size/position.js";
import { attr, css } from "../../../helpers/utils/index.js";
import { UIElement } from "../../element.js";
let UITooltip = UITooltip_1 = class UITooltip extends UIElement {
    className() {
        return 'UITooltip';
    }
    render() {
        return '<div><div class="&__content"></div></div>';
    }
    constructor(view) {
        super(view);
        this.__isOpened = false;
        this.__listenClose = false;
        this.__currentTarget = null;
        this.__delayShowTimeout = 0;
        this.__hideTimeout = 0;
        if (!view.o.textIcons &&
            view.o.showTooltip &&
            !view.o.useNativeTooltip) {
            view.hookStatus(STATUSES.ready, () => {
                // TODO Move it inside __open method. Now it is here because testcase failed with capturing
                getContainer(this.j, UITooltip_1).appendChild(this.container);
                view.e.on(view.container, 'mouseenter.tooltip', this.__onMouseEnter, {
                    capture: true
                });
            });
        }
    }
    __addListenersOnClose() {
        if (this.__listenClose) {
            return;
        }
        this.__listenClose = true;
        const view = this.j;
        view.e
            .on(view.ow, 'scroll.tooltip', this.__hide)
            .on(view.ow, 'joditCloseDialog', this.__hide)
            .on(view.container, 'mouseleave.tooltip', this.__hide)
            .on([
            'escape.tooltip',
            'change.tooltip',
            'changePlace.tooltip',
            'afterOpenPopup.tooltip',
            'hidePopup.tooltip',
            'closeAllPopups.tooltip'
        ], this.__hide)
            .on(view.container, 'mouseleave', this.__onMouseLeave, {
            capture: true
        });
    }
    __removeListenersOnClose() {
        if (!this.__listenClose) {
            return;
        }
        this.__listenClose = false;
        const view = this.j;
        view.e
            .off(view.ow, 'scroll.tooltip', this.__hide)
            .off([
            'escape.tooltip',
            'change.tooltip',
            'changePlace.tooltip',
            'afterOpenPopup.tooltip',
            'hidePopup.tooltip',
            'closeAllPopups.tooltip'
        ], this.__hide)
            .off(view.container, 'mouseleave.tooltip', this.__onMouseLeave);
    }
    __onMouseLeave(e) {
        if (this.__currentTarget === e.target) {
            this.__hideDelay();
            this.__currentTarget = null;
        }
    }
    __onMouseEnter(e) {
        if (!Dom.isHTMLElement(e.target)) {
            return;
        }
        const tooltip = attr(e.target, 'aria-label');
        if (!tooltip) {
            return;
        }
        const disabled = Boolean(attr(e.target, 'disabled'));
        if (disabled) {
            return;
        }
        const isOwn = e.target.className.includes('jodit');
        if (!isOwn) {
            return;
        }
        this.__currentTarget = e.target;
        const pos = position(e.target);
        this.__addListenersOnClose();
        this.__delayOpen(() => ({
            x: pos.left + pos.width / 2,
            y: pos.top + pos.height
        }), tooltip);
    }
    __delayOpen(getPoint, content) {
        const to = this.j.o.showTooltipDelay || this.j.defaultTimeout;
        this.j.async.clearTimeout(this.__hideTimeout);
        this.j.async.clearTimeout(this.__delayShowTimeout);
        this.__delayShowTimeout = this.j.async.setTimeout(() => this.__open(getPoint, content), {
            timeout: to,
            label: 'tooltip'
        });
    }
    __open(getPoint, content) {
        this.setMod('visible', true);
        this.getElm('content').innerHTML = content;
        this.__isOpened = true;
        this.__setPosition(getPoint);
    }
    __setPosition(getPoint) {
        const point = getPoint();
        css(this.container, {
            left: point.x,
            top: point.y
        });
    }
    __hide() {
        this.j.async.clearTimeout(this.__delayShowTimeout);
        this.j.async.clearTimeout(this.__hideTimeout);
        this.__removeListenersOnClose();
        if (this.__isOpened) {
            this.__isOpened = false;
            this.setMod('visible', false);
            css(this.container, {
                left: -5000
            });
        }
    }
    __hideDelay() {
        if (!this.__isOpened) {
            return;
        }
        this.j.async.clearTimeout(this.__delayShowTimeout);
        this.__hideTimeout = this.async.setTimeout(this.__hide, this.j.defaultTimeout);
    }
    destruct() {
        this.j.e.off(this.j.container, 'mouseenter', this.__onMouseEnter);
        this.__hide();
        super.destruct();
    }
};
__decorate([
    autobind
], UITooltip.prototype, "__onMouseLeave", null);
__decorate([
    autobind
], UITooltip.prototype, "__onMouseEnter", null);
__decorate([
    autobind
], UITooltip.prototype, "__hide", null);
__decorate([
    autobind
], UITooltip.prototype, "__hideDelay", null);
UITooltip = UITooltip_1 = __decorate([
    component
], UITooltip);
export { UITooltip };
