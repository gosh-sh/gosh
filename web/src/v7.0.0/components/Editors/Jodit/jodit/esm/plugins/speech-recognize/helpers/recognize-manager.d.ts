/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/speech-recognize
 */
import type { CanUndef, IAsync, IDestructible } from "../../../types";
import type { ISpeechRecognize } from "../interface";
import { Eventify } from "../../../core/event-emitter/eventify";
export declare class RecognizeManager extends Eventify<{
    pulse: (enable: boolean) => void;
    result: (text: string) => void;
    progress: (text: string) => void;
    error: () => void;
    sound: (type: number) => void;
}> implements IDestructible {
    private async;
    private _lang;
    set lang(v: CanUndef<string>);
    get lang(): CanUndef<string>;
    private _continuous;
    set continuous(v: boolean);
    get continuous(): boolean;
    private _interimResults;
    set interimResults(v: boolean);
    get interimResults(): boolean;
    sound: boolean;
    constructor(async: IAsync, api: ISpeechRecognize);
    private static _instances;
    destruct(): void;
    private _isEnabled;
    get isEnabled(): boolean;
    start(): void;
    stop(): void;
    toggle(): void;
    restart(): void;
    private _restartTimeout;
    private _onSpeechStart;
    private readonly _api;
    private __on;
    private __off;
    private _progressTimeout;
    private _onResult;
    private _onError;
    private _makeSound;
}
