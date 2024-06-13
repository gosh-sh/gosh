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
import * as consts from "../../core/constants.js";
import { IS_ES_NEXT, IS_IE, KEY_ALT } from "../../core/constants.js";
import { autobind, watch } from "../../core/decorators/index.js";
import { Dom } from "../../core/dom/dom.js";
import { eventEmitter, pluginSystem } from "../../core/global.js";
import { $$, attr, css, dataBind, innerWidth, markOwner, offset } from "../../core/helpers/index.js";
import { Plugin } from "../../core/plugin/plugin.js";
import "./config.js";
const keyBInd = '__jodit-resizer_binded';
/**
 * The module creates a supporting frame for resizing of the elements img and table
 */
export class resizer extends Plugin {
    constructor() {
        super(...arguments);
        this.LOCK_KEY = 'resizer';
        this.element = null;
        this.isResizeMode = false;
        this.isShown = false;
        this.startX = 0;
        this.startY = 0;
        this.width = 0;
        this.height = 0;
        this.ratio = 0;
        this.rect = this.j.c.fromHTML(`<div title="${this.j.i18n('Press Alt for custom resizing')}" class="jodit-resizer">
				<div class="jodit-resizer__top-left"></div>
				<div class="jodit-resizer__top-right"></div>
				<div class="jodit-resizer__bottom-right"></div>
				<div class="jodit-resizer__bottom-left"></div>
				<span>100x100</span>
			</div>`);
        this.sizeViewer = this.rect.getElementsByTagName('span')[0];
        this.pointerX = 0;
        this.pointerY = 0;
        this.isAltMode = false;
        this.onClickElement = (element) => {
            if (this.isResizeMode) {
                return;
            }
            if (this.element !== element || !this.isShown) {
                this.element = element;
                this.show();
                if (Dom.isTag(this.element, 'img') && !this.element.complete) {
                    this.j.e.one(this.element, 'load', this.updateSize);
                }
            }
        };
        this.updateSize = () => {
            if (this.isInDestruct || !this.isShown) {
                return;
            }
            if (this.element && this.rect) {
                const workplacePosition = this.getWorkplacePosition();
                const pos = offset(this.element, this.j, this.j.ed), left = parseInt(this.rect.style.left || '0', 10), top = parseInt(this.rect.style.top || '0', 10), w = this.rect.offsetWidth, h = this.rect.offsetHeight;
                const newTop = pos.top - workplacePosition.top, newLeft = pos.left - workplacePosition.left;
                if (top !== newTop ||
                    left !== newLeft ||
                    w !== this.element.offsetWidth ||
                    h !== this.element.offsetHeight) {
                    css(this.rect, {
                        top: newTop,
                        left: newLeft,
                        width: this.element.offsetWidth,
                        height: this.element.offsetHeight
                    });
                    if (this.j.events) {
                        this.j.e.fire(this.element, 'changesize');
                        // check for first init. Ex. inlinePopup hides when it was fired
                        if (!isNaN(left)) {
                            this.j.e.fire('resize');
                        }
                    }
                }
            }
        };
        this.hideSizeViewer = () => {
            this.sizeViewer.style.opacity = '0';
        };
    }
    /** @override */
    afterInit(editor) {
        $$('div', this.rect).forEach((resizeHandle) => {
            editor.e.on(resizeHandle, 'mousedown.resizer touchstart.resizer', this.onStartResizing.bind(this, resizeHandle));
        });
        eventEmitter.on('hideHelpers', this.hide);
        editor.e
            .on('readonly', (isReadOnly) => {
            if (isReadOnly) {
                this.hide();
            }
        })
            .on('afterInit changePlace', this.addEventListeners.bind(this))
            .on('afterGetValueFromEditor.resizer', (data) => {
            const rgx = /<jodit[^>]+data-jodit_iframe_wrapper[^>]+>(.*?<iframe[^>]*>.*?<\/iframe>.*?)<\/jodit>/gi;
            if (rgx.test(data.value)) {
                data.value = data.value.replace(rgx, '$1');
            }
        });
        this.addEventListeners();
        this.__onChangeEditor();
    }
    /**
     * Click in the editor area
     */
    onEditorClick(e) {
        let node = e.target;
        const { editor, options: { allowResizeTags } } = this.j;
        while (node && node !== editor) {
            if (Dom.isTag(node, allowResizeTags)) {
                this.__bind(node);
                this.onClickElement(node);
                return;
            }
            node = node.parentNode;
        }
    }
    addEventListeners() {
        const editor = this.j;
        editor.e
            .off(editor.editor, '.resizer')
            .off(editor.ow, '.resizer')
            .on(editor.editor, 'keydown.resizer', (e) => {
            if (this.isShown &&
                e.key === consts.KEY_DELETE &&
                this.element &&
                !Dom.isTag(this.element, 'table')) {
                this.onDelete(e);
            }
        })
            .on(editor.ow, 'resize.resizer', this.updateSize)
            .on('resize.resizer', this.updateSize)
            .on([editor.ow, editor.editor], 'scroll.resizer', () => {
            if (this.isShown && !this.isResizeMode) {
                this.hide();
            }
        })
            .on(editor.ow, 'keydown.resizer', this.onKeyDown)
            .on(editor.ow, 'keyup.resizer', this.onKeyUp)
            .on(editor.ow, 'mouseup.resizer touchend.resizer', this.onClickOutside);
    }
    onStartResizing(resizeHandle, e) {
        if (!this.element || !this.element.parentNode) {
            this.hide();
            return false;
        }
        this.handle = resizeHandle;
        if (e.cancelable) {
            e.preventDefault();
        }
        e.stopImmediatePropagation();
        this.width = this.element.offsetWidth;
        this.height = this.element.offsetHeight;
        this.ratio = this.width / this.height;
        this.isResizeMode = true;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.pointerX = e.clientX;
        this.pointerY = e.clientY;
        const { j } = this;
        j.e.fire('hidePopup');
        j.lock(this.LOCK_KEY);
        j.e.on(j.ow, 'mousemove.resizer touchmove.resizer', this.onResize);
    }
    onEndResizing() {
        const { j } = this;
        j.unlock();
        this.isResizeMode = false;
        this.isAltMode = false;
        j.synchronizeValues();
        j.e.off(j.ow, 'mousemove.resizer touchmove.resizer', this.onResize);
    }
    onResize(e) {
        if (this.isResizeMode) {
            if (!this.element) {
                return;
            }
            this.pointerX = e.clientX;
            this.pointerY = e.clientY;
            let diff_x, diff_y;
            if (this.j.options.iframe) {
                const workplacePosition = this.getWorkplacePosition();
                diff_x = e.clientX + workplacePosition.left - this.startX;
                diff_y = e.clientY + workplacePosition.top - this.startY;
            }
            else {
                diff_x = this.pointerX - this.startX;
                diff_y = this.pointerY - this.startY;
            }
            const className = this.handle.className;
            let new_w = 0, new_h = 0;
            const uar = this.j.o.resizer.useAspectRatio;
            if (!this.isAltMode &&
                (uar === true || (uar && Dom.isTag(this.element, uar)))) {
                if (diff_x) {
                    new_w =
                        this.width +
                            (className.match(/left/) ? -1 : 1) * diff_x;
                    new_h = Math.round(new_w / this.ratio);
                }
                else {
                    new_h =
                        this.height +
                            (className.match(/top/) ? -1 : 1) * diff_y;
                    new_w = Math.round(new_h * this.ratio);
                }
                if (new_w > innerWidth(this.j.editor, this.j.ow)) {
                    new_w = innerWidth(this.j.editor, this.j.ow);
                    new_h = Math.round(new_w / this.ratio);
                }
            }
            else {
                new_w =
                    this.width + (className.match(/left/) ? -1 : 1) * diff_x;
                new_h =
                    this.height + (className.match(/top/) ? -1 : 1) * diff_y;
            }
            if (new_w > this.j.o.resizer.min_width) {
                if (new_w < this.rect.parentNode.offsetWidth) {
                    this.applySize(this.element, 'width', new_w);
                }
                else {
                    this.applySize(this.element, 'width', '100%');
                }
            }
            if (new_h > this.j.o.resizer.min_height) {
                this.applySize(this.element, 'height', new_h);
            }
            this.updateSize();
            this.showSizeViewer(this.element.offsetWidth, this.element.offsetHeight);
            e.stopImmediatePropagation();
        }
    }
    onKeyDown(e) {
        this.isAltMode = e.key === KEY_ALT;
        if (!this.isAltMode && this.isResizeMode) {
            this.onEndResizing();
        }
    }
    onKeyUp() {
        if (this.isAltMode && this.isResizeMode && this.element) {
            this.width = this.element.offsetWidth;
            this.height = this.element.offsetHeight;
            this.ratio = this.width / this.height;
            this.startX = this.pointerX;
            this.startY = this.pointerY;
        }
        this.isAltMode = false;
    }
    onClickOutside(e) {
        if (!this.isShown) {
            return;
        }
        if (!this.isResizeMode) {
            return this.hide();
        }
        e.stopImmediatePropagation();
        this.onEndResizing();
    }
    getWorkplacePosition() {
        return offset((this.rect.parentNode || this.j.od.documentElement), this.j, this.j.od, true);
    }
    applySize(element, key, value) {
        const changeAttrs = Dom.isImage(element) && this.j.o.resizer.forImageChangeAttributes;
        if (changeAttrs) {
            attr(element, key, value);
        }
        if (!changeAttrs || element.style[key]) {
            css(element, key, value);
        }
    }
    onDelete(e) {
        if (!this.element) {
            return;
        }
        if (this.element.tagName !== 'JODIT') {
            this.j.s.select(this.element);
        }
        else {
            Dom.safeRemove(this.element);
            this.hide();
            e.preventDefault();
        }
    }
    __onChangeEditor() {
        if (this.isShown) {
            if (!this.element || !this.element.parentNode) {
                this.hide();
            }
            else {
                this.updateSize();
            }
        }
        $$('iframe', this.j.editor).forEach(this.__bind);
    }
    /**
     * Bind an edit element to element
     * @param element - The element that you want to add a function to resize
     */
    __bind(element) {
        if (!Dom.isHTMLElement(element) ||
            !this.j.o.allowResizeTags.has(element.tagName.toLowerCase()) ||
            dataBind(element, keyBInd)) {
            return;
        }
        dataBind(element, keyBInd, true);
        let wrapper;
        if (Dom.isTag(element, 'iframe')) {
            const iframe = element;
            if (Dom.isHTMLElement(element.parentNode) &&
                attr(element.parentNode, '-jodit_iframe_wrapper')) {
                element = element.parentNode;
            }
            else {
                wrapper = this.j.createInside.element('jodit', {
                    'data-jodit-temp': 1,
                    contenteditable: false,
                    draggable: true,
                    'data-jodit_iframe_wrapper': 1
                });
                attr(wrapper, 'style', attr(element, 'style'));
                css(wrapper, {
                    display: element.style.display === 'inline-block'
                        ? 'inline-block'
                        : 'block',
                    width: element.offsetWidth,
                    height: element.offsetHeight
                });
                if (element.parentNode) {
                    element.parentNode.insertBefore(wrapper, element);
                }
                wrapper.appendChild(element);
                this.j.e.on(wrapper, 'click', () => {
                    attr(wrapper, 'data-jodit-wrapper_active', true);
                });
                element = wrapper;
            }
            this.j.e
                .off(element, 'mousedown.select touchstart.select')
                .on(element, 'mousedown.select touchstart.select', () => {
                this.j.s.select(element);
            })
                .off(element, 'changesize')
                .on(element, 'changesize', () => {
                iframe.setAttribute('width', element.offsetWidth + 'px');
                iframe.setAttribute('height', element.offsetHeight + 'px');
            });
        }
        this.j.e.on(element, 'dragstart', this.hide);
        if (!IS_ES_NEXT && IS_IE) {
            // for IE don't show native resizer
            this.j.e.on(element, 'mousedown', (event) => {
                if (Dom.isTag(element, 'img')) {
                    event.preventDefault();
                }
            });
        }
    }
    showSizeViewer(w, h) {
        if (!this.j.o.resizer.showSize) {
            return;
        }
        if (w < this.sizeViewer.offsetWidth ||
            h < this.sizeViewer.offsetHeight) {
            this.hideSizeViewer();
            return;
        }
        this.sizeViewer.style.opacity = '1';
        this.sizeViewer.textContent = `${w} x ${h}`;
        this.j.async.setTimeout(this.hideSizeViewer, {
            timeout: this.j.o.resizer.hideSizeTimeout,
            label: 'hideSizeViewer'
        });
    }
    /**
     * Show resizer
     */
    show() {
        if (this.j.o.readonly || this.isShown) {
            return;
        }
        this.isShown = true;
        if (!this.rect.parentNode) {
            markOwner(this.j, this.rect);
            this.j.workplace.appendChild(this.rect);
        }
        if (this.j.isFullSize) {
            this.rect.style.zIndex = css(this.j.container, 'zIndex').toString();
        }
        this.updateSize();
    }
    /**
     * Hide resizer
     */
    hide() {
        if (!this.isResizeMode) {
            this.isResizeMode = false;
            this.isShown = false;
            this.element = null;
            Dom.safeRemove(this.rect);
            $$("[data-jodit-wrapper_active='true']", this.j.editor).forEach(elm => attr(elm, 'data-jodit-wrapper_active', false));
        }
    }
    beforeDestruct(jodit) {
        this.hide();
        eventEmitter.off('hideHelpers', this.hide);
        jodit.e.off(this.j.ow, '.resizer').off('.resizer');
    }
}
__decorate([
    watch(':click')
], resizer.prototype, "onEditorClick", null);
__decorate([
    autobind
], resizer.prototype, "onStartResizing", null);
__decorate([
    autobind
], resizer.prototype, "onEndResizing", null);
__decorate([
    autobind
], resizer.prototype, "onResize", null);
__decorate([
    autobind
], resizer.prototype, "onKeyDown", null);
__decorate([
    autobind
], resizer.prototype, "onKeyUp", null);
__decorate([
    autobind
], resizer.prototype, "onClickOutside", null);
__decorate([
    watch(':change')
], resizer.prototype, "__onChangeEditor", null);
__decorate([
    autobind
], resizer.prototype, "__bind", null);
__decorate([
    autobind,
    watch(':hideResizer')
], resizer.prototype, "hide", null);
pluginSystem.add('resizer', resizer);
