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
var Dialog_1;
import { STATUSES } from "../../core/component/index.js";
import { KEY_ESC } from "../../core/constants.js";
import { autobind, component, hook } from "../../core/decorators/index.js";
import { Dom } from "../../core/dom/dom.js";
import { eventEmitter, pluginSystem } from "../../core/global.js";
import { asArray, splitArray, toArray } from "../../core/helpers/array/index.js";
import { hasContainer, isArray, isBoolean, isFunction, isString, isVoid } from "../../core/helpers/checker/index.js";
import { $$, attr, ConfigProto, css } from "../../core/helpers/utils/index.js";
import { assert } from "../../core/helpers/utils/assert.js";
import { Icon } from "../../core/ui/index.js";
import { View } from "../../core/view/view.js";
import { ViewWithToolbar } from "../../core/view/view-with-toolbar.js";
import { Config } from "../../config.js";
Config.prototype.dialog = {
    namespace: '',
    extraButtons: [],
    /**
     * This dialog can resize by trigger
     */
    resizable: true,
    /**
     * This dialog can move by header
     */
    draggable: true,
    buttons: ['dialog.close'],
    removeButtons: [],
    toolbarButtonSize: 'middle',
    zIndex: 'inherit'
};
Config.prototype.controls.dialog = {
    close: {
        icon: 'cancel',
        exec: dialog => {
            dialog.close();
        }
    }
};
/**
 * Module to generate dialog windows
 */
let Dialog = Dialog_1 = class Dialog extends ViewWithToolbar {
    /** @override */
    className() {
        return 'Dialog';
    }
    get destination() {
        return (this.o.shadowRoot ?? this.od.body);
    }
    setElements(root, elements) {
        const elements_list = [];
        asArray(elements).forEach((elm) => {
            if (isArray(elm)) {
                const div = this.c.div(this.getFullElName('column'));
                elements_list.push(div);
                root.appendChild(div);
                return this.setElements(div, elm);
            }
            let element;
            if (isString(elm)) {
                element = this.c.fromHTML(elm);
            }
            else {
                element = hasContainer(elm) ? elm.container : elm;
            }
            elements_list.push(element);
            if (element.parentNode !== root) {
                root.appendChild(element);
            }
        });
        toArray(root.childNodes).forEach((elm) => {
            if (elements_list.indexOf(elm) === -1) {
                root.removeChild(elm);
            }
        });
    }
    onMouseUp() {
        if (this.draggable || this.resizable) {
            this.removeGlobalResizeListeners();
            this.draggable = false;
            this.resizable = false;
            this.unlockSelect();
            if (this.e) {
                this.removeGlobalResizeListeners();
                /**
                 * Fired when the dialog box is finished to resizing
                 */
                this.e.fire(this, 'endResize endMove');
            }
        }
    }
    /**
     *
     */
    onHeaderMouseDown(e) {
        const target = e.target;
        if (!this.o.draggable ||
            (target && target.nodeName.match(/^(INPUT|SELECT)$/))) {
            return;
        }
        this.draggable = true;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.startPoint.x = css(this.dialog, 'left');
        this.startPoint.y = css(this.dialog, 'top');
        this.setMaxZIndex();
        if (e.cancelable) {
            e.preventDefault();
        }
        this.lockSelect();
        this.addGlobalResizeListeners();
        if (this.e) {
            /**
             * Fired when dialog box is started moving
             */
            this.e.fire(this, 'startMove');
            this.e.fire('closeAllPopups');
        }
    }
    onMouseMove(e) {
        if (this.draggable && this.o.draggable) {
            this.setPosition(this.startPoint.x + e.clientX - this.startX, this.startPoint.y + e.clientY - this.startY);
            if (this.e) {
                /**
                 * Fired when dialog box is moved
                 */
                this.e.fire(this, 'move', e.clientX - this.startX, e.clientY - this.startY);
            }
            e.stopImmediatePropagation();
        }
        if (this.resizable && this.o.resizable) {
            this.setSize(this.startPoint.w + e.clientX - this.startX, this.startPoint.h + e.clientY - this.startY);
            if (this.e) {
                /**
                 * Fired when dialog box is resized
                 */
                this.e.fire(this, 'resizeDialog', e.clientX - this.startX, e.clientY - this.startY);
            }
        }
    }
    onEsc(e) {
        if (!this.o.closeOnEsc) {
            return;
        }
        if (this.isOpened &&
            e.key === KEY_ESC &&
            this.getMod('static') !== true) {
            const me = this.getMaxZIndexDialog();
            if (me) {
                me.close();
            }
            else {
                this.close();
            }
            e.stopImmediatePropagation();
        }
    }
    onResizerMouseDown(e) {
        this.resizable = true;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.startPoint.w = this.dialog.offsetWidth;
        this.startPoint.h = this.dialog.offsetHeight;
        this.lockSelect();
        this.addGlobalResizeListeners();
        if (this.e) {
            /**
             * Fired when dialog box is started resizing
             */
            this.e.fire(this, 'startResize');
        }
    }
    addGlobalResizeListeners() {
        const self = this;
        self.e
            .on(self.ow, 'pointermove touchmove', self.onMouseMove)
            .on(self.ow, 'pointerup touchend', self.onMouseUp);
    }
    removeGlobalResizeListeners() {
        const self = this;
        self.e
            .off(self.ow, 'mousemove pointermove', self.onMouseMove)
            .off(self.ow, 'mouseup pointerup', self.onMouseUp);
    }
    /**
     * Specifies the size of the window
     *
     * @param w - The width of the window
     * @param h - The height of the window
     */
    setSize(w, h) {
        if (w == null) {
            w = this.dialog.offsetWidth;
        }
        if (h == null) {
            h = this.dialog.offsetHeight;
        }
        css(this.dialog, {
            width: w,
            height: h
        });
        return this;
    }
    /**
     * Recalculate auto sizes
     */
    calcAutoSize() {
        this.setSize('auto', 'auto');
        this.setSize();
        return this;
    }
    /**
     * Specifies the position of the upper left corner of the window . If x and y are specified,
     * the window is centered on the center of the screen
     *
     * @param x - Position px Horizontal
     * @param y - Position px Vertical
     */
    setPosition(x, y) {
        const w = this.ow.innerWidth, h = this.ow.innerHeight;
        let left = w / 2 - this.dialog.offsetWidth / 2, top = h / 2 - this.dialog.offsetHeight / 2;
        if (left < 0) {
            left = 0;
        }
        if (top < 0) {
            top = 0;
        }
        if (x !== undefined && y !== undefined) {
            this.offsetX = x;
            this.offsetY = y;
            this.moved = Math.abs(x - left) > 100 || Math.abs(y - top) > 100;
        }
        this.dialog.style.left = (x || left) + 'px';
        this.dialog.style.top = (y || top) + 'px';
        return this;
    }
    /**
     * Specifies the dialog box title . It can take a string and an array of objects
     *
     * @param content - A string or an HTML element ,
     * or an array of strings and elements
     * @example
     * ```javascript
     * var dialog = new Jodi.modules.Dialog(parent);
     * dialog.setHeader('Hello world');
     * dialog.setHeader(['Hello world', '<button>OK</button>', $('<div>some</div>')]);
     * dialog.open();
     * ```
     */
    setHeader(content) {
        this.setElements(this.dialogbox_header, content);
        return this;
    }
    /**
     * It specifies the contents of the dialog box. It can take a string and an array of objects
     *
     * @param content - A string or an HTML element ,
     * or an array of strings and elements
     * @example
     * ```javascript
     * var dialog = new Jodi.modules.Dialog(parent);
     * dialog.setHeader('Hello world');
     * dialog.setContent('<form onsubmit="alert(1);"><input type="text" /></form>');
     * dialog.open();
     * ```
     */
    setContent(content) {
        this.setElements(this.dialogbox_content, content);
        return this;
    }
    /**
     * Sets the bottom of the dialog. It can take a string and an array of objects
     *
     * @param content - A string or an HTML element ,
     * or an array of strings and elements
     * @example
     * ```javascript
     * var dialog = new Jodi.modules.Dialog(parent);
     * dialog.setHeader('Hello world');
     * dialog.setContent('<form><input id="someText" type="text" /></form>');
     * dialog.setFooter([
     *  $('<a class="jodit-button">OK</a>').click(function () {
     *      alert($('someText').val())
     *      dialog.close();
     *  })
     * ]);
     * dialog.open();
     * ```
     */
    setFooter(content) {
        this.setElements(this.dialogbox_footer, content);
        this.setMod('footer', Boolean(content));
        return this;
    }
    /**
     * Get zIndex from dialog
     */
    getZIndex() {
        return parseInt(css(this.container, 'zIndex'), 10) || 0;
    }
    /**
     * Get dialog instance with maximum z-index displaying it on top of all the dialog boxes
     */
    getMaxZIndexDialog() {
        let maxZi = 0, dlg, zIndex, res = this;
        $$('.jodit-dialog', this.destination).forEach((dialog) => {
            dlg = dialog.component;
            zIndex = parseInt(css(dialog, 'zIndex'), 10);
            if (dlg.isOpened && !isNaN(zIndex) && zIndex > maxZi) {
                res = dlg;
                maxZi = zIndex;
            }
        });
        return res;
    }
    /**
     * Sets the maximum z-index dialog box, displaying it on top of all the dialog boxes
     */
    setMaxZIndex() {
        if (this.getMod('static'))
            return;
        let maxZIndex = 20000004, zIndex = 0;
        $$('.jodit-dialog', this.destination).forEach(dialog => {
            zIndex = parseInt(css(dialog, 'zIndex'), 10);
            maxZIndex = Math.max(isNaN(zIndex) ? 0 : zIndex, maxZIndex);
        });
        this.container.style.zIndex = (maxZIndex + 1).toString();
    }
    /**
     * Expands the dialog on full browser window
     */
    toggleFullSize(isFullSize) {
        if (isVoid(isFullSize)) {
            isFullSize = !this.getMod('fullsize');
        }
        this.setMod('fullsize', isFullSize);
        super.toggleFullSize(isFullSize);
    }
    /**
     * It opens a dialog box to center it, and causes the two event.
     *
     * @param contentOrClose - specifies the contents of the dialog box.
     * Can be false or undefined. see [[Dialog.setContent]]
     * @param title - specifies the title of the dialog box, @see setHeader
     * @param destroyAfterClose - true - After closing the window , the destructor will be called.
     * @param modal - true window will be opened in modal mode
     */
    open(contentOrClose, titleOrModal, destroyAfterClose, modal) {
        eventEmitter.fire('closeAllPopups hideHelpers');
        /**
         * Called before the opening of the dialog box
         */
        if (this.e.fire(this, 'beforeOpen') === false) {
            return this;
        }
        if (isBoolean(contentOrClose)) {
            destroyAfterClose = contentOrClose;
        }
        if (isBoolean(titleOrModal)) {
            modal = titleOrModal;
        }
        this.destroyAfterClose = destroyAfterClose === true;
        const content = isBoolean(contentOrClose) ? undefined : contentOrClose;
        const title = isBoolean(titleOrModal) ? undefined : titleOrModal;
        if (title !== undefined) {
            this.setHeader(title);
        }
        if (content) {
            this.setContent(content);
        }
        this.setMod('active', true);
        this.isOpened = true;
        this.setModal(modal);
        this.destination.appendChild(this.container);
        if (this.getMod('static') !== true) {
            this.setPosition(this.offsetX, this.offsetY);
            this.setMaxZIndex();
        }
        else {
            this.container.style.removeProperty('z-index');
        }
        if (this.o.fullsize) {
            this.toggleFullSize(true);
        }
        /**
         * Called after the opening of the dialog box
         */
        this.e.fire('afterOpen', this);
        return this;
    }
    /**
     * Set modal mode
     */
    setModal(modal) {
        this.isModal = Boolean(modal);
        this.setMod('modal', this.isModal);
        return this;
    }
    /****
     * Closes the dialog box , if you want to call the method `destruct`
     *
     * @see destroy
     * @example
     * ```javascript
     * //You can close dialog two ways
     * var dialog = new Jodit.modules.Dialog();
     * dialog.open('Hello world!', 'Title');
     * var $close = dialog.create.fromHTML('<a href="#" style="float:left;" class="jodit-button">
     *     <i class="icon icon-check"></i>&nbsp;' + Jodit.prototype.i18n('Ok') + '</a>');
     * $close.addEventListener('click', function () {
     *     dialog.close();
     * });
     * dialog.setFooter($close);
     * // and second way, you can close dialog from content
     * dialog.open('<a onclick="var event = doc.createEvent('HTMLEvents'); event.initEvent('close_dialog', true, true);
     * this.dispatchEvent(event)">Close</a>', 'Title');
     * ```
     */
    close() {
        if (this.isDestructed ||
            !this.isOpened ||
            this.getMod('static') === true) {
            return this;
        }
        const { e } = this;
        /**
         * Called up to close the window
         */
        if (e.fire(this, 'beforeClose') === false ||
            e.fire('beforeClose', this) === false) {
            return this;
        }
        this.setMod('active', false);
        this.isOpened = false;
        if (this.isFullSize) {
            this.toggleFullSize(false);
        }
        Dom.safeRemove(this.container);
        this.removeGlobalResizeListeners();
        /**
         * It called after the window is closed
         */
        e.fire(this, 'afterClose');
        e.fire(this.ow, 'joditCloseDialog');
        if (this.destroyAfterClose) {
            this.destruct();
        }
        return this;
    }
    constructor(options = {}) {
        super(options);
        this.destroyAfterClose = false;
        this.moved = false;
        this.resizable = false;
        this.draggable = false;
        this.startX = 0;
        this.startY = 0;
        this.startPoint = { x: 0, y: 0, w: 0, h: 0 };
        this.lockSelect = () => {
            this.setMod('moved', true);
        };
        this.unlockSelect = () => {
            this.setMod('moved', false);
        };
        this.onResize = () => {
            if (this.options &&
                this.o.resizable &&
                !this.moved &&
                this.isOpened &&
                !this.offsetX &&
                !this.offsetY) {
                this.setPosition();
            }
        };
        this.isModal = false;
        /**
         * True, if dialog was opened
         */
        this.isOpened = false;
        const self = this;
        self.options = ConfigProto(options, ConfigProto(Config.prototype.dialog, Dialog_1.defaultOptions));
        Dom.safeRemove(self.container);
        const n = this.getFullElName.bind(this);
        self.container = this.c.fromHTML(`<div class="jodit jodit-dialog ${this.componentName}">
				<div class="${n('overlay')}"></div>
				<div class="${this.getFullElName('panel')}">
					<div class="${n('header')}">
						<div class="${n('header-title')}"></div>
						<div class="${n('header-toolbar')}"></div>
					</div>
					<div class="${n('content')}"></div>
					<div class="${n('footer')}"></div>
					<div class="${n('resizer')}">${Icon.get('resize_handler')}</div>
				</div>
			</div>`);
        if (this.o.zIndex) {
            this.container.style.zIndex = this.o.zIndex.toString();
        }
        attr(self.container, 'role', 'dialog');
        Object.defineProperty(self.container, 'component', {
            value: this
        });
        self.setMod('theme', self.o.theme || 'default').setMod('resizable', Boolean(self.o.resizable));
        const dialog = self.getElm('panel');
        assert(dialog != null, 'Panel element does not exist');
        const resizer = self.getElm('resizer');
        assert(resizer != null, 'Resizer element does not exist');
        const dialogbox_header = self.getElm('header-title');
        assert(dialogbox_header != null, 'header-title element does not exist');
        const dialogbox_content = self.getElm('content');
        assert(dialogbox_content != null, 'Content element does not exist');
        const dialogbox_footer = self.getElm('footer');
        assert(dialogbox_footer != null, 'Footer element does not exist');
        const dialogbox_toolbar = self.getElm('header-toolbar');
        assert(dialogbox_toolbar != null, 'header-toolbar element does not exist');
        this.dialog = dialog;
        this.resizer = resizer;
        this.dialogbox_header = dialogbox_header;
        this.dialogbox_content = dialogbox_content;
        this.dialogbox_footer = dialogbox_footer;
        this.dialogbox_toolbar = dialogbox_toolbar;
        css(self.dialog, {
            maxWidth: self.options.maxWidth,
            minHeight: self.options.minHeight,
            minWidth: self.options.minWidth
        });
        const headerBox = self.getElm('header');
        headerBox &&
            self.e.on(headerBox, 'pointerdown touchstart', self.onHeaderMouseDown);
        self.e.on(self.resizer, 'mousedown touchstart', self.onResizerMouseDown);
        const fullSize = pluginSystem.get('fullsize');
        isFunction(fullSize) && fullSize(self);
        this.e
            .on(self.container, 'close_dialog', self.close)
            .on(this.ow, 'keydown', this.onEsc)
            .on(this.ow, 'resize', this.onResize);
        if (this.o.closeOnClickOverlay) {
            const overlay = self.getElm('overlay');
            assert(overlay != null, 'Overlay element does not exist');
            this.e.on(overlay, 'click', self.close);
        }
    }
    /**
     * Build toolbar after ready
     */
    buildToolbar() {
        this.o.buttons &&
            this.toolbar
                .build(splitArray(this.o.buttons))
                .setMod('mode', 'header')
                .appendTo(this.dialogbox_toolbar);
    }
    /**
     * It destroys all objects created for the windows and also includes all the handlers for the window object
     */
    destruct() {
        if (this.isInDestruct) {
            return;
        }
        this.setStatus(STATUSES.beforeDestruct);
        if (this.isOpened) {
            this.close();
        }
        if (this.events) {
            this.removeGlobalResizeListeners();
            this.events
                .off(this.container, 'close_dialog', self.close)
                .off(this.ow, 'keydown', this.onEsc)
                .off(this.ow, 'resize', this.onResize);
        }
        super.destruct();
    }
};
__decorate([
    autobind
], Dialog.prototype, "onMouseUp", null);
__decorate([
    autobind
], Dialog.prototype, "onHeaderMouseDown", null);
__decorate([
    autobind
], Dialog.prototype, "onMouseMove", null);
__decorate([
    autobind
], Dialog.prototype, "onEsc", null);
__decorate([
    autobind
], Dialog.prototype, "onResizerMouseDown", null);
__decorate([
    autobind
], Dialog.prototype, "close", null);
__decorate([
    hook('ready')
], Dialog.prototype, "buildToolbar", null);
Dialog = Dialog_1 = __decorate([
    component
], Dialog);
export { Dialog };
Dialog.defaultOptions = {
    ...View.defaultOptions,
    closeOnClickOverlay: false,
    closeOnEsc: true
};
