/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/speech-recognize
 */
import { PII } from "../constants.js";
/**
 * @internal
 */
export function sound({ sec = 0.1, frequency = PII, gain = 0.1, type = 'sine' } = {}) {
    if (typeof window.AudioContext === 'undefined' &&
        typeof window.webkitAudioContext === 'undefined') {
        return;
    }
    // one context per document
    const context = new (window.AudioContext ||
        window.webkitAudioContext)();
    const vol = context.createGain();
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency; // Hz
    osc.connect(vol);
    vol.connect(context.destination);
    osc.start(); // start the oscillator
    osc.stop(context.currentTime + sec);
    vol.gain.value = gain;
}
