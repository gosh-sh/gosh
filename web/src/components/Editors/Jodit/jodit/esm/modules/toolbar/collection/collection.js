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
import { autobind, component, debounce, hook } from "../../../core/decorators/index.js";
import { error } from "../../../core/helpers/utils/error/error.js";
import { UIList, UITooltip } from "../../../core/ui/index.js";
import { makeButton, makeSelect } from "../factory.js";
let ToolbarCollection = class ToolbarCollection extends UIList {
    /** @override */
    className() {
        return 'ToolbarCollection';
    }
    /**
     * First button in a list
     */
    get firstButton() {
        const [button] = this.buttons;
        return button || null;
    }
    makeButton(control, target = null) {
        return makeButton(this.j, control, target);
    }
    makeSelect(control, target = null) {
        return makeSelect(this.j, control, target);
    }
    /**
     * Button should be active
     */
    shouldBeActive(button) {
        return undefined;
    }
    /**
     * The Button should be disabled
     */
    shouldBeDisabled(button) {
        return undefined;
    }
    /**
     * Returns current target for button
     */
    getTarget(button) {
        return button.target || null;
    }
    __immediateUpdate() {
        if (this.isDestructed || this.j.isLocked) {
            return;
        }
        super.update();
        this.j.e.fire('afterUpdateToolbar', this);
    }
    update() {
        this.__immediateUpdate();
    }
    /**
     * Set direction
     */
    setDirection(direction) {
        this.container.style.direction = direction;
        this.container.setAttribute('dir', direction);
    }
    constructor(jodit) {
        super(jodit);
        this.__listenEvents = 'updatePlugins updateToolbar changeStack mousedown mouseup keydown change afterInit readonly afterResize ' +
            'selectionchange changeSelection focus afterSetMode touchstart focus blur';
        this.__tooltip = new UITooltip(this.jodit);
    }
    __initEvents() {
        this.j.e
            .on(this.__listenEvents, this.update)
            .on('afterSetMode focus', this.__immediateUpdate);
    }
    hide() {
        this.container.remove();
    }
    show() {
        this.appendTo(this.j.toolbarContainer);
    }
    showInline(bound) {
        throw error('The method is not implemented for this class.');
    }
    /** @override **/
    build(items, target = null) {
        const itemsWithGroupps = this.j.e.fire('beforeToolbarBuild', items);
        if (itemsWithGroupps) {
            items = itemsWithGroupps;
        }
        super.build(items, target);
        return this;
    }
    /** @override **/
    destruct() {
        if (this.isDestructed) {
            return;
        }
        this.__tooltip?.destruct();
        this.__tooltip = null;
        this.j.e
            .off(this.__listenEvents, this.update)
            .off('afterSetMode focus', this.__immediateUpdate);
        super.destruct();
    }
};
__decorate([
    autobind
], ToolbarCollection.prototype, "__immediateUpdate", null);
__decorate([
    debounce()
], ToolbarCollection.prototype, "update", null);
__decorate([
    hook('ready')
], ToolbarCollection.prototype, "__initEvents", null);
ToolbarCollection = __decorate([
    component
], ToolbarCollection);
export { ToolbarCollection };
