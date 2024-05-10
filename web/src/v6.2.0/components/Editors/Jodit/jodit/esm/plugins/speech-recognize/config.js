/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { isBoolean } from "../../core/helpers/checker/is-boolean.js";
import { dataBind } from "../../core/helpers/utils/data-bind.js";
import { Icon } from "../../core/ui/icon.js";
import { SpeechRecognition } from "./helpers/api.js";
import { RecognizeManager } from "./helpers/recognize-manager.js";
import speechRecognizeIcon from "./speech-recognize.svg.js";
import { Config } from "../../config.js";
Config.prototype.speechRecognize = {
    api: SpeechRecognition,
    sound: true,
    continuous: true,
    interimResults: true,
    commands: {
        'newline|enter': 'enter',
        'delete|remove word|delete word': 'backspaceWordButton',
        comma: 'inserthtml::,',
        underline: 'inserthtml::_',
        hyphen: 'inserthtml::-',
        space: 'inserthtml:: ',
        question: 'inserthtml::?',
        dot: 'inserthtml::.',
        'quote|quotes|open quote': "inserthtml::'",
        'header|header h1': 'formatblock::h1',
        'select all': 'selectall'
    }
};
Icon.set('speech-recognize', speechRecognizeIcon);
Config.prototype.controls.speechRecognize = {
    isActive(jodit, _) {
        const api = dataBind(jodit, 'speech');
        return Boolean(api?.isEnabled);
    },
    isDisabled(jodit) {
        return !jodit.o.speechRecognize.api;
    },
    exec(jodit, current, { button, control }) {
        const { api: Api, lang, continuous, interimResults, sound } = jodit.o.speechRecognize;
        if (!Api) {
            jodit.alert('Speech recognize API unsupported in your browser');
            return;
        }
        let api = dataBind(jodit, 'speech');
        if (!api) {
            const nativeApi = new Api();
            api = new RecognizeManager(jodit.async, nativeApi);
            api.lang = lang;
            api.continuous = continuous;
            api.interimResults = interimResults;
            api.sound = sound;
            dataBind(jodit, 'speech', api);
            api.on('pulse', (enable) => {
                button.setMod('pulse', enable);
            });
            api.on('result', (text) => jodit.e.fire('speechRecognizeResult', text));
            api.on('progress', (text) => jodit.e.fire('speechRecognizeProgressResult', text));
            button.hookStatus('beforeDestruct', () => {
                api.destruct();
            });
        }
        if (control.args) {
            const key = control.args[0];
            if (isBoolean(api[key])) {
                api[key] = !api[key];
                if (api.isEnabled) {
                    api.restart();
                }
                return;
            }
        }
        api.toggle();
        button.state.activated = api.isEnabled;
    },
    name: 'speechRecognize',
    command: 'toggleSpeechRecognize',
    tooltip: 'Speech Recognize',
    list: {
        sound: 'Sound',
        interimResults: 'Interim Results'
    },
    childTemplate(jodit, key, value) {
        const api = dataBind(jodit, 'speech'), checked = api?.[key] ?? jodit.o.speechRecognize[key];
        return `<span class='jodit-speech-recognize__list-item'><input ${checked ? 'checked' : ''} class='jodit-checkbox' type='checkbox'>&nbsp;${value}</span>`;
    },
    mods: {
        stroke: false
    }
};
