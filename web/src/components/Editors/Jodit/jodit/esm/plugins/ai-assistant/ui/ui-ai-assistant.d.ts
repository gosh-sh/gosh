/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/ai-assistant
 */
import type { IJodit } from "../../../types";
import { UITextArea } from "../../../core/ui";
import { UIElement } from "../../../core/ui/element";

export declare class UiAiAssistant extends UIElement<IJodit> {
    private __body;
    private __buttons;
    private __results;
    private __spinner;
    private __error;
    promptInput: UITextArea;
    private __insertAfterButton;
    private __submitButton;
    private __tryAgainButton;
    private __insertButton;
    private __formAiAssistant;
    className(): string;
    constructor(jodit: IJodit, { onInsert, onInsertAfter }: {
        onInsert: (html: string) => void;
        onInsertAfter: (html: string) => void;
    });
    protected render(): string;
    setPrompt(prompt: string): void;
    private __aiResult;
    protected onAiAssistentResponse(result: string): void;
    protected onAiAssistentError(error: string): void;
    protected onChangePromptValue(): void;
    private __toggleSubmitButton;
    private __toggleInsertButton;
}
