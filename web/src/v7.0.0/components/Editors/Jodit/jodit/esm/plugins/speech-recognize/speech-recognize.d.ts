/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/speech-recognize/README.md]]
 * @packageDocumentation
 * @module plugins/speech-recognize
 */
import type { IJodit, IPlugin } from "../../types";
import { Plugin } from "../../core/plugin";
import "./config";

export declare class SpeechRecognizeNative extends Plugin implements IPlugin {
    constructor(j: IJodit);
    protected afterInit(jodit: IJodit): void;
    protected beforeDestruct(jodit: IJodit): void;
    private messagePopup;
    protected onSpeechRecognizeProgressResult(text: string): void;
    protected onSpeechRecognizeResult(text: string): void;
    private _checkCommand;
    private _commandToWord;
}
