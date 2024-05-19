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
import { component } from "../../../core/decorators/component/component.js";
import { watch } from "../../../core/decorators/watch/watch.js";
import { Dom } from "../../../core/dom/dom.js";
import { isString } from "../../../core/helpers/checker/is-string.js";
import { Button, UIBlock, UIForm, UITextArea } from "../../../core/ui/index.js";
import { UIElement } from "../../../core/ui/element.js";
let UiAiAssistant = class UiAiAssistant extends UIElement {
    className() {
        return 'UIAiAssistant';
    }
    constructor(jodit, { onInsert, onInsertAfter }) {
        super(jodit);
        this.__aiResult = '';
        this.__error = this.getElm('error');
        this.__body = this.getElm('body');
        this.__buttons = this.getElm('buttons');
        this.__results = this.getElm('results');
        this.__spinner = this.getElm('spinner');
        this.__insertButton = Button(jodit, '', 'Insert', 'primary').onAction(() => onInsert(this.__aiResult));
        this.__insertAfterButton = Button(jodit, '', 'Insert After', 'initial').onAction(() => onInsertAfter(this.__aiResult));
        const onSubmit = () => {
            if (this.__formAiAssistant.validate()) {
                this.__formAiAssistant.submit();
                this.__toggleInsertButton(true);
                this.__toggleSubmitButton(true);
            }
        };
        this.__submitButton = Button(jodit, 'ai-assistant', '').onAction(onSubmit);
        this.__tryAgainButton = Button(jodit, 'update', '', 'initial').onAction(onSubmit);
        this.promptInput = new UITextArea(jodit, {
            name: 'prompt',
            required: true,
            label: 'Prompt',
            placeholder: 'Ask AI to improve generated text',
            className: this.getFullElName('prompt-row-input')
        });
        const buttonsBLock = new UIBlock(jodit, [
            this.__insertButton,
            this.__insertAfterButton,
            this.__tryAgainButton
        ], {
            className: this.getFullElName('prompt-row')
        });
        this.__formAiAssistant = new UIForm(jodit, [
            new UIBlock(jodit, [this.promptInput, this.__submitButton], {
                className: this.getFullElName('prompt-row')
            })
        ]).onSubmit((data) => {
            this.__error.textContent = '';
            this.setMod('loading', true);
            jodit.e.fire('invokeAiAssistant', data.prompt);
            const hideMod = this.getFullElName('', 'hide', 'true');
            this.__results.classList.remove(hideMod);
            this.__buttons.classList.remove(hideMod);
            Dom.detach(this.__results);
            this.__results.appendChild(this.__spinner);
            this.__insertButton.focus();
        });
        this.__buttons.appendChild(buttonsBLock.container);
        this.__body.appendChild(this.__formAiAssistant.container);
        this.onChangePromptValue();
    }
    render() {
        return `<div>
				<div class="&__container">
						<div class="&__error"></div>
						<div class="&__body"></div>
						<div class="&__buttons &_hide_true"></div>
						<div class="&__results &_hide_true">
								<div class="&__spinner"></div>
						</div>
				</div>
		</div>`;
    }
    setPrompt(prompt) {
        if (prompt) {
            const { jodit } = this;
            const promptOpt = jodit.o.aiAssistant[prompt];
            const { aiCommonPrefixPrompt, aiCommonSuffixPrompt } = jodit.o.aiAssistant;
            this.promptInput.value = [
                aiCommonPrefixPrompt,
                isString(promptOpt) ? promptOpt : '',
                aiCommonSuffixPrompt
            ]
                .filter(Boolean)
                .join(' ');
            this.__toggleInsertButton(true);
            if (this.promptInput.value) {
                this.__formAiAssistant.submit();
                this.__toggleSubmitButton(true);
            }
        }
        this.promptInput.focus();
    }
    onAiAssistentResponse(result) {
        this.setMod('loading', false);
        Dom.detach(this.__results);
        this.__aiResult = result;
        this.__results.appendChild(this.jodit.c.fromHTML(result));
        this.__toggleSubmitButton(false);
        this.__toggleInsertButton(false);
    }
    onAiAssistentError(error) {
        this.__aiResult = '';
        this.setMod('loading', false);
        this.__error.textContent = error;
        Dom.detach(this.__results);
        this.__toggleSubmitButton(false);
        const hideMod = this.getFullElName('', 'hide', 'true');
        this.__results.classList.add(hideMod);
        this.__toggleInsertButton(true);
    }
    onChangePromptValue() {
        this.__toggleSubmitButton(!this.promptInput.value);
    }
    __toggleSubmitButton(value) {
        this.__submitButton.state.disabled = value;
        this.__tryAgainButton.state.disabled = value;
    }
    __toggleInsertButton(value) {
        this.__insertButton.state.disabled = value;
        this.__insertAfterButton.state.disabled = value;
    }
};
__decorate([
    watch(':ai-assistant-response')
], UiAiAssistant.prototype, "onAiAssistentResponse", null);
__decorate([
    watch(':ai-assistant-error')
], UiAiAssistant.prototype, "onAiAssistentError", null);
__decorate([
    watch('promptInput:change')
], UiAiAssistant.prototype, "onChangePromptValue", null);
UiAiAssistant = __decorate([
    component
], UiAiAssistant);
export { UiAiAssistant };
