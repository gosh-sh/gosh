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
var RecognizeManager_1;
import { autobind } from "../../../core/decorators/index.js";
import { Eventify } from "../../../core/event-emitter/eventify.js";
import { sound } from "./sound.js";
import { PII, WARN } from "../constants.js";
let RecognizeManager = RecognizeManager_1 = class RecognizeManager extends Eventify {
    set lang(v) {
        this._lang = v;
        this._api.lang = v;
    }
    get lang() {
        return this._lang;
    }
    set continuous(v) {
        this._continuous = v;
        this._api.continuous = v;
    }
    get continuous() {
        return this._continuous;
    }
    set interimResults(v) {
        this._interimResults = v;
        this._api.interimResults = v;
    }
    get interimResults() {
        return this._interimResults;
    }
    constructor(async, api) {
        super();
        this.async = async;
        this._continuous = false;
        this._interimResults = false;
        this.sound = true;
        this._isEnabled = false;
        this._restartTimeout = 0;
        this._onSpeechStart = (e) => {
            if (!this._isEnabled) {
                return;
            }
            this.async.clearTimeout(this._restartTimeout);
            this._restartTimeout = this.async.setTimeout(() => {
                this.restart();
                this.emit('pulse', false);
                this._makeSound(WARN);
            }, 5000);
            this.emit('pulse', true);
        };
        this._progressTimeout = 0;
        this._api = api;
        RecognizeManager_1._instances.add(this);
    }
    destruct() {
        this.stop();
        RecognizeManager_1._instances.delete(this);
        super.destruct();
    }
    get isEnabled() {
        return this._isEnabled;
    }
    start() {
        if (this._isEnabled) {
            return;
        }
        this._isEnabled = true;
        RecognizeManager_1._instances.forEach(instance => {
            if (instance !== this) {
                instance.stop();
            }
        });
        this._api.start();
        this.__on('speechstart', this._onSpeechStart)
            .__on('error', this._onError)
            .__on('result', this._onResult);
    }
    stop() {
        if (!this._isEnabled) {
            return;
        }
        try {
            this._api.abort();
            this._api.stop();
        }
        catch { }
        this.__off('speechstart', this._onSpeechStart)
            .__off('error', this._onError)
            .__off('result', this._onResult);
        this.async.clearTimeout(this._restartTimeout);
        this._isEnabled = false;
        this.emit('pulse', false);
    }
    toggle() {
        if (!this._isEnabled) {
            this.start();
        }
        else {
            this.stop();
        }
    }
    restart() {
        this.stop();
        this.start();
    }
    __on(event, callback) {
        this._api.addEventListener(event, callback);
        return this;
    }
    __off(event, callback) {
        this._api.removeEventListener(event, callback);
        return this;
    }
    _onResult(e) {
        if (!this._isEnabled) {
            return;
        }
        this.async.clearTimeout(this._progressTimeout);
        const resultItem = e.results.item(e.resultIndex);
        const { transcript } = resultItem.item(0);
        const resultHandler = () => {
            try {
                this.async.clearTimeout(this._restartTimeout);
                this.emit('result', transcript);
            }
            catch { }
            this.restart();
            this.emit('pulse', false);
            this._makeSound(PII);
        };
        if (resultItem.isFinal === false) {
            this.emit('progress', transcript);
            this._progressTimeout = this.async.setTimeout(resultHandler, 500);
            return;
        }
        resultHandler();
    }
    _onError() {
        if (!this._isEnabled) {
            return;
        }
        this._makeSound(WARN);
        this.emit('pulse', false);
        this.restart();
    }
    _makeSound(frequency) {
        if (this.sound) {
            sound({ frequency });
        }
    }
};
RecognizeManager._instances = new Set();
RecognizeManager = RecognizeManager_1 = __decorate([
    autobind
], RecognizeManager);
export { RecognizeManager };
