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
import { STATUSES } from "../../../component/statuses.js";
import { cache, cacheHTML, component, watch } from "../../../decorators/index.js";
import { Dom } from "../../../dom/dom.js";
import { isFunction } from "../../../helpers/checker/is-function.js";
import { isString } from "../../../helpers/checker/is-string.js";
import { assert, attr } from "../../../helpers/utils/index.js";
import { UIElement } from "../../element.js";
import { UIList } from "../../group/list.js";
import { Icon } from "../../icon.js";
export const UIButtonState = () => ({
    size: 'middle',
    type: 'button',
    name: '',
    value: '',
    variant: 'initial',
    disabled: false,
    activated: false,
    icon: {
        name: 'empty',
        fill: '',
        iconURL: ''
    },
    tooltip: '',
    text: '',
    tabIndex: undefined
});
let UIButton = class UIButton extends UIElement {
    /** @override */
    className() {
        return 'UIButton';
    }
    /**
     * Set state
     */
    setState(state) {
        Object.assign(this.state, state);
        return this;
    }
    /**
     * DOM container for text content
     */
    get text() {
        const text = this.getElm('text');
        assert(text, 'Text element not found');
        return text;
    }
    /**
     * DOM container for icon
     */
    get icon() {
        const icon = this.getElm('icon');
        assert(icon, 'Icon element not found');
        return icon;
    }
    onChangeSize() {
        this.setMod('size', this.state.size);
    }
    onChangeType() {
        attr(this.container, 'type', this.state.type);
    }
    /**
     * Set size from a parent list
     */
    updateSize() {
        const pe = this.closest(UIList);
        if (pe) {
            this.state.size = pe.buttonSize;
            return;
        }
    }
    onChangeStatus() {
        this.setMod('variant', this.state.variant);
    }
    onChangeText() {
        this.text.textContent = this.jodit.i18n(this.state.text);
    }
    onChangeTextSetMode() {
        this.setMod('text-icons', Boolean(this.state.text.trim().length));
    }
    onChangeDisabled() {
        attr(this.container, 'disabled', this.state.disabled || null);
    }
    onChangeActivated() {
        attr(this.container, 'aria-pressed', this.state.activated);
    }
    onChangeName() {
        this.container.classList.add(`${this.componentName}_${this.clearName(this.state.name)}`);
        this.name = this.state.name;
        attr(this.container, 'data-ref', this.state.name);
        attr(this.container, 'ref', this.state.name);
    }
    onChangeTooltip() {
        if (this.get('j.o.useNativeTooltip')) {
            attr(this.container, 'title', this.state.tooltip);
        }
        attr(this.container, 'aria-label', this.state.tooltip);
    }
    onChangeTabIndex() {
        attr(this.container, 'tabindex', this.state.tabIndex);
    }
    onChangeIcon() {
        const textIcons = this.get('j.o.textIcons');
        if (textIcons === true ||
            (isFunction(textIcons) && textIcons(this.state.name))) {
            return;
        }
        Dom.detach(this.icon);
        const iconElement = Icon.makeIcon(this.j, this.state.icon);
        iconElement && this.icon.appendChild(iconElement);
    }
    /**
     * Set focus on an element
     */
    focus() {
        this.container.focus();
    }
    /**
     * Element has focus
     */
    isFocused() {
        const { activeElement } = this.od;
        return Boolean(activeElement && Dom.isOrContains(this.container, activeElement));
    }
    /** @override */
    createContainer() {
        const cn = this.componentName;
        const button = this.j.c.element('button', {
            class: cn,
            type: 'button',
            role: 'button',
            ariaPressed: false
        });
        const icon = this.j.c.span(cn + '__icon');
        const text = this.j.c.span(cn + '__text');
        button.appendChild(icon);
        button.appendChild(text);
        return button;
    }
    constructor(jodit, state) {
        super(jodit);
        /**
         * Marker for buttons
         */
        this.isButton = true;
        this.state = UIButtonState();
        this.actionHandlers = [];
        this.button = this.container;
        this.updateSize();
        this.onChangeSize();
        this.onChangeStatus();
        if (state) {
            this.hookStatus(STATUSES.ready, () => {
                this.setState(state);
            });
        }
    }
    destruct() {
        this.j.e.off(this.container);
        return super.destruct();
    }
    /**
     * Add action handler
     */
    onAction(callback) {
        this.actionHandlers.push(callback);
        return this;
    }
    /**
     * Fire all click handlers
     */
    __onActionFire(e) {
        e.buffer = {
            actionTrigger: this
        };
        this.actionHandlers.forEach(callback => callback.call(this, e));
    }
};
__decorate([
    cache
], UIButton.prototype, "text", null);
__decorate([
    cache
], UIButton.prototype, "icon", null);
__decorate([
    watch('state.size', { immediately: false })
], UIButton.prototype, "onChangeSize", null);
__decorate([
    watch('state.type', { immediately: false })
], UIButton.prototype, "onChangeType", null);
__decorate([
    watch('parentElement')
], UIButton.prototype, "updateSize", null);
__decorate([
    watch('state.variant', { immediately: false })
], UIButton.prototype, "onChangeStatus", null);
__decorate([
    watch('state.text', { immediately: false })
], UIButton.prototype, "onChangeText", null);
__decorate([
    watch('state.text', { immediately: false })
], UIButton.prototype, "onChangeTextSetMode", null);
__decorate([
    watch('state.disabled')
], UIButton.prototype, "onChangeDisabled", null);
__decorate([
    watch('state.activated')
], UIButton.prototype, "onChangeActivated", null);
__decorate([
    watch('state.name', { immediately: false })
], UIButton.prototype, "onChangeName", null);
__decorate([
    watch('state.tooltip', { immediately: false })
], UIButton.prototype, "onChangeTooltip", null);
__decorate([
    watch('state.tabIndex', { immediately: false })
], UIButton.prototype, "onChangeTabIndex", null);
__decorate([
    watch('state.icon', { immediately: false })
], UIButton.prototype, "onChangeIcon", null);
__decorate([
    cacheHTML
], UIButton.prototype, "createContainer", null);
__decorate([
    watch('button:click')
], UIButton.prototype, "__onActionFire", null);
UIButton = __decorate([
    component
], UIButton);
export { UIButton };
export function Button(jodit, stateOrText, text, variant) {
    const button = new UIButton(jodit);
    button.state.tabIndex = jodit.o.allowTabNavigation ? 0 : -1;
    if (isString(stateOrText)) {
        button.state.icon.name = stateOrText;
        button.state.name = stateOrText;
        if (variant) {
            button.state.variant = variant;
        }
        if (text) {
            button.state.text = text;
        }
    }
    else {
        button.setState(stateOrText);
    }
    return button;
}
