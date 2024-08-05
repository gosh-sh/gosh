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
var UIInput_1;
import { autobind, component, debounce, watch } from "../../../../decorators/index.js";
import { Dom } from "../../../../dom/dom.js";
import { toArray } from "../../../../helpers/array/to-array.js";
import { attr } from "../../../../helpers/utils/index.js";
import { UIElement } from "../../../element.js";
import { inputValidators } from "../../validators/index.js";
import { Icon } from "../../../icon.js";
let UIInput = UIInput_1 = class UIInput extends UIElement {
    /** @override */
    className() {
        return 'UIInput';
    }
    onChangeClear() {
        if (this.state.clearButton) {
            Dom.after(this.nativeInput, this.clearButton);
        }
        else {
            Dom.safeRemove(this.clearButton);
        }
    }
    onChangeClassName(ignore, oldClassName) {
        oldClassName && this.container.classList.remove(oldClassName);
        this.state.className &&
            this.container.classList.add(this.state.className);
    }
    onChangeState() {
        this.name = this.state.name;
        const input = this.nativeInput, { name, icon, type, ref, required, placeholder, autocomplete, label } = this.state;
        attr(input, 'name', name);
        attr(input, 'type', type);
        attr(input, 'data-ref', ref || name);
        attr(input, 'ref', ref || name);
        attr(input, 'required', required || null);
        attr(input, 'autocomplete', !autocomplete ? 'off' : null);
        attr(input, 'placeholder', placeholder ? this.j.i18n(placeholder) : '');
        if (icon && Icon.exists(icon)) {
            Dom.before(input, this.icon);
            this.icon.innerHTML = Icon.get(icon);
        }
        else {
            Dom.safeRemove(this.icon);
        }
        if (label) {
            Dom.before(this.wrapper, this.label);
            this.label.innerText = this.j.i18n(label);
        }
        else {
            Dom.safeRemove(this.label);
        }
        this.updateValidators();
    }
    updateValidators() {
        this.validators.clear();
        if (this.state.required) {
            this.validators.add(inputValidators.required);
        }
        this.state.validators?.forEach(name => {
            const validator = inputValidators[name];
            validator && this.validators.add(validator);
        });
    }
    set error(value) {
        this.setMod('has-error', Boolean(value));
        if (!value) {
            Dom.safeRemove(this.__errorBox);
        }
        else {
            this.__errorBox.innerText = this.j.i18n(value, this.j.i18n(this.state.label || ''));
            this.container.appendChild(this.__errorBox);
        }
    }
    get value() {
        return this.nativeInput.value;
    }
    set value(value) {
        if (this.value !== value) {
            this.nativeInput.value = value;
            this.onChangeValue();
        }
    }
    /**
     * Call on every state value changed
     */
    onChangeStateValue() {
        const value = this.state.value.toString();
        if (value !== this.value) {
            this.value = value;
        }
    }
    /**
     * Call on every native value changed
     */
    onChangeValue() {
        const { value } = this;
        if (this.state.value !== value) {
            this.state.value = value;
            this.j.e.fire(this, 'change', value);
            this.state.onChange?.(value);
        }
    }
    validate() {
        this.error = '';
        return toArray(this.validators).every(validator => validator(this));
    }
    /** @override **/
    createContainer(options) {
        const container = super.createContainer();
        this.wrapper = this.j.c.div(this.getFullElName('wrapper'));
        if (!this.nativeInput) {
            this.nativeInput = this.createNativeInput();
        }
        const { nativeInput } = this;
        nativeInput.classList.add(this.getFullElName('input'));
        this.wrapper.appendChild(nativeInput);
        container.appendChild(this.wrapper);
        attr(nativeInput, 'dir', this.j.o.direction || 'auto');
        return container;
    }
    /**
     * Create native input element
     */
    createNativeInput(options) {
        return this.j.create.element('input');
    }
    /** @override **/
    constructor(jodit, options) {
        super(jodit, options);
        this.label = this.j.c.span(this.getFullElName('label'));
        this.icon = this.j.c.span(this.getFullElName('icon'));
        this.clearButton = this.j.c.span(this.getFullElName('clear'), Icon.get('cancel'));
        this.state = { ...UIInput_1.defaultState };
        this.__errorBox = this.j.c.span(this.getFullElName('error'));
        this.validators = new Set([]);
        if (options?.value !== undefined) {
            options.value = options.value.toString();
        }
        Object.assign(this.state, options);
        if (this.state.clearButton !== undefined) {
            this.j.e
                .on(this.clearButton, 'click', (e) => {
                e.preventDefault();
                this.nativeInput.value = '';
                this.j.e.fire(this.nativeInput, 'input');
                this.focus();
            })
                .on(this.nativeInput, 'input', () => {
                this.state.clearButton = Boolean(this.value.length);
            });
            this.state.clearButton = Boolean(this.value.length);
        }
        this.j.e
            .on(this.nativeInput, 'focus blur', () => {
            this.onChangeFocus();
        })
            .on(this.nativeInput, 'input change', this.onChangeValue);
        this.onChangeState();
        this.onChangeClassName();
        this.onChangeStateValue();
    }
    focus() {
        this.nativeInput.focus();
    }
    get isFocused() {
        return this.nativeInput === this.j.od.activeElement;
    }
    /**
     * Set `focused` mod on change focus
     */
    onChangeFocus() {
        this.setMod('focused', this.isFocused);
    }
};
UIInput.defaultState = {
    className: '',
    autocomplete: true,
    name: '',
    value: '',
    icon: '',
    label: '',
    ref: '',
    type: 'text',
    placeholder: '',
    required: false,
    validators: []
};
__decorate([
    watch('state.clearButton')
], UIInput.prototype, "onChangeClear", null);
__decorate([
    watch('state.className')
], UIInput.prototype, "onChangeClassName", null);
__decorate([
    watch([
        'state.name',
        'state.type',
        'state.label',
        'state.placeholder',
        'state.autocomplete',
        'state.icon'
    ], { immediately: false }),
    debounce()
], UIInput.prototype, "onChangeState", null);
__decorate([
    watch('state.value')
], UIInput.prototype, "onChangeStateValue", null);
__decorate([
    autobind
], UIInput.prototype, "onChangeValue", null);
UIInput = UIInput_1 = __decorate([
    component
], UIInput);
export { UIInput };
