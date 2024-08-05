/*!
 * jodit - Jodit is an awesome and useful wysiwyg editor with filebrowser
 * Author: Chupurnov <chupurnov@gmail.com> (https://xdsoft.net/jodit/)
 * Version: v4.2.14
 * Url: https://xdsoft.net/jodit/
 * License(s): MIT
 */
	
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else {
		var a = factory();
		for(var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];
	}
})(self, function() {
return (self["webpackChunkjodit"] = self["webpackChunkjodit"] || []).push([[882],{

/***/ 71096:
/***/ (function(__unused_webpack_module, __unused_webpack___webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var jodit_core_helpers_checker_is_boolean__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(9810);
/* harmony import */ var jodit_core_helpers_utils_data_bind__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(72197);
/* harmony import */ var jodit_core_ui_icon__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(931);
/* harmony import */ var _helpers_api__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(71722);
/* harmony import */ var _helpers_recognize_manager__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(93676);
/* harmony import */ var _speech_recognize_svg__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(22227);
/* harmony import */ var _speech_recognize_svg__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_speech_recognize_svg__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var jodit_config__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(36115);
/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */







jodit_config__WEBPACK_IMPORTED_MODULE_5__/* .Config */ .T.prototype.speechRecognize = {
    api: _helpers_api__WEBPACK_IMPORTED_MODULE_2__/* .SpeechRecognition */ .o,
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
jodit_core_ui_icon__WEBPACK_IMPORTED_MODULE_1__/* .Icon */ .I.set('speech-recognize', (_speech_recognize_svg__WEBPACK_IMPORTED_MODULE_4___default()));
jodit_config__WEBPACK_IMPORTED_MODULE_5__/* .Config */ .T.prototype.controls.speechRecognize = {
    isActive(jodit, _) {
        const api = (0,jodit_core_helpers_utils_data_bind__WEBPACK_IMPORTED_MODULE_0__/* .dataBind */ .m)(jodit, 'speech');
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
        let api = (0,jodit_core_helpers_utils_data_bind__WEBPACK_IMPORTED_MODULE_0__/* .dataBind */ .m)(jodit, 'speech');
        if (!api) {
            const nativeApi = new Api();
            api = new _helpers_recognize_manager__WEBPACK_IMPORTED_MODULE_3__/* .RecognizeManager */ .g(jodit.async, nativeApi);
            api.lang = lang;
            api.continuous = continuous;
            api.interimResults = interimResults;
            api.sound = sound;
            (0,jodit_core_helpers_utils_data_bind__WEBPACK_IMPORTED_MODULE_0__/* .dataBind */ .m)(jodit, 'speech', api);
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
            if ((0,jodit_core_helpers_checker_is_boolean__WEBPACK_IMPORTED_MODULE_6__/* .isBoolean */ .L)(api[key])) {
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
        const api = (0,jodit_core_helpers_utils_data_bind__WEBPACK_IMPORTED_MODULE_0__/* .dataBind */ .m)(jodit, 'speech'), checked = api?.[key] ?? jodit.o.speechRecognize[key];
        return `<span class='jodit-speech-recognize__list-item'><input ${checked ? 'checked' : ''} class='jodit-checkbox' type='checkbox'>&nbsp;${value}</span>`;
    },
    mods: {
        stroke: false
    }
};


/***/ }),

/***/ 81629:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   N: function() { return /* binding */ PII; },
/* harmony export */   Z: function() { return /* binding */ WARN; }
/* harmony export */ });
/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/speech-recognize
 * @internal
 */
const PII = 440;
const WARN = 940;


/***/ }),

/***/ 71722:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   o: function() { return /* binding */ SpeechRecognition; }
/* harmony export */ });
/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
const SpeechRecognition = window.SpeechRecognition ||
    window.webkitSpeechRecognition;


/***/ }),

/***/ 50834:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   F: function() { return /* binding */ execSpellCommand; }
/* harmony export */ });
/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
function execSpellCommand(jodit, commandSentence) {
    const [command, value] = commandSentence.split('::');
    jodit.execCommand(command, null, value);
}


/***/ }),

/***/ 93676:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   g: function() { return /* binding */ RecognizeManager; }
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(31635);
/* harmony import */ var jodit_core_decorators__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(22664);
/* harmony import */ var jodit_core_event_emitter_eventify__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(43431);
/* harmony import */ var _sound__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(95473);
/* harmony import */ var jodit_plugins_speech_recognize_constants__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(81629);
/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
var RecognizeManager_1;





let RecognizeManager = RecognizeManager_1 = class RecognizeManager extends jodit_core_event_emitter_eventify__WEBPACK_IMPORTED_MODULE_1__/* .Eventify */ .h {
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
                this._makeSound(jodit_plugins_speech_recognize_constants__WEBPACK_IMPORTED_MODULE_2__/* .WARN */ .Z);
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
            this._makeSound(jodit_plugins_speech_recognize_constants__WEBPACK_IMPORTED_MODULE_2__/* .PII */ .N);
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
        this._makeSound(jodit_plugins_speech_recognize_constants__WEBPACK_IMPORTED_MODULE_2__/* .WARN */ .Z);
        this.emit('pulse', false);
        this.restart();
    }
    _makeSound(frequency) {
        if (this.sound) {
            (0,_sound__WEBPACK_IMPORTED_MODULE_3__/* .sound */ .s)({ frequency });
        }
    }
};
RecognizeManager._instances = new Set();
RecognizeManager = RecognizeManager_1 = (0,tslib__WEBPACK_IMPORTED_MODULE_4__/* .__decorate */ .Cg)([
    jodit_core_decorators__WEBPACK_IMPORTED_MODULE_0__.autobind
], RecognizeManager);



/***/ }),

/***/ 95473:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   s: function() { return /* binding */ sound; }
/* harmony export */ });
/* harmony import */ var jodit_plugins_speech_recognize_constants__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(81629);
/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/speech-recognize
 */

/**
 * @internal
 */
function sound({ sec = 0.1, frequency = jodit_plugins_speech_recognize_constants__WEBPACK_IMPORTED_MODULE_0__/* .PII */ .N, gain = 0.1, type = 'sine' } = {}) {
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


/***/ }),

/***/ 61593:
/***/ (function(module) {

"use strict";

/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
module.exports = {
    newline: 'الخط الجديد',
    delete: 'حذف',
    space: 'الفضاء',
    'Speech Recognize': 'التعرف على الكلام',
    Sound: 'الصوت',
    'Interim Results': 'النتائج المؤقتة'
};


/***/ }),

/***/ 64458:
/***/ (function(module) {

"use strict";

/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
module.exports = {
    newline: 'řádek',
    delete: 'odstranit',
    space: 'prostora',
    'Speech Recognize': 'Rozpoznání Řeči',
    Sound: 'Zvuk',
    'Interim Results': 'Průběžné Výsledky'
};


/***/ }),

/***/ 89601:
/***/ (function(module) {

"use strict";

/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
module.exports = {
    newline: 'Zeilenumbruch',
    delete: 'löschen',
    space: 'Raum',
    'Speech Recognize': 'Sprache Erkennen',
    Sound: 'Sound',
    'Interim Results': 'Zwischenergebnis'
};


/***/ }),

/***/ 87710:
/***/ (function(module) {

"use strict";

/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
module.exports = {
    newline: 'nueva línea',
    delete: 'eliminar',
    space: 'espacio',
    'Speech Recognize': 'Reconocimiento de Voz',
    Sound: 'Sonido',
    'Interim Results': 'Resultados Provisionales'
};


/***/ }),

/***/ 15603:
/***/ (function(module) {

"use strict";

/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
module.exports = {
    newline: 'خط جدید',
    delete: 'حذف',
    space: 'فضا',
    'Speech Recognize': 'گفتار را تشخیص دهید',
    Sound: 'صدا',
    'Interim Results': 'نتایج موقت'
};


/***/ }),

/***/ 84059:
/***/ (function(module) {

"use strict";

/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
module.exports = {
    'Speech Recognize': 'Puheentunnistus',
    newline: 'uusi rivi',
    delete: 'poistaa',
    space: 'tilaa',
    Sound: 'Ääni',
    'Interim Results': 'Välitulokset'
};


/***/ }),

/***/ 13958:
/***/ (function(module) {

"use strict";

/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
module.exports = {
    newline: 'nouvelle ligne',
    delete: 'supprimer',
    space: 'espace',
    'Speech Recognize': 'Reconnaissance Vocale',
    Sound: 'Son',
    'Interim Results': 'Résultats Intermédiaires'
};


/***/ }),

/***/ 18717:
/***/ (function(module) {

"use strict";

/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
module.exports = {
    newline: 'חדשות',
    delete: 'מחק',
    space: 'שטח',
    'Speech Recognize': 'דיבור מזהה',
    Sound: 'קול',
    'Interim Results': 'תוצאות ביניים'
};


/***/ }),

/***/ 14765:
/***/ (function(module) {

"use strict";

/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
module.exports = {
    newline: 'újsor',
    delete: 'törlés',
    space: 'tér',
    'Speech Recognize': 'A Beszéd Felismeri',
    Sound: 'Hang',
    'Interim Results': 'Időközi Eredmények'
};


/***/ }),

/***/ 77995:
/***/ (function(module) {

"use strict";

/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
module.exports = {
    newline: 'newline',
    delete: 'Hapus',
    space: 'ruang',
    'Speech Recognize': 'Pidato Mengenali',
    Sound: 'Suara',
    'Interim Results': 'Hasil Sementara'
};


/***/ }),

/***/ 25202:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ar: function() { return /* reexport module object */ _ar_js__WEBPACK_IMPORTED_MODULE_0__; },
/* harmony export */   cs_cz: function() { return /* reexport module object */ _cs_cz_js__WEBPACK_IMPORTED_MODULE_1__; },
/* harmony export */   de: function() { return /* reexport module object */ _de_js__WEBPACK_IMPORTED_MODULE_2__; },
/* harmony export */   es: function() { return /* reexport module object */ _es_js__WEBPACK_IMPORTED_MODULE_3__; },
/* harmony export */   fa: function() { return /* reexport module object */ _fa_js__WEBPACK_IMPORTED_MODULE_4__; },
/* harmony export */   fi: function() { return /* reexport module object */ _fi_js__WEBPACK_IMPORTED_MODULE_5__; },
/* harmony export */   fr: function() { return /* reexport module object */ _fr_js__WEBPACK_IMPORTED_MODULE_6__; },
/* harmony export */   he: function() { return /* reexport module object */ _he_js__WEBPACK_IMPORTED_MODULE_7__; },
/* harmony export */   hu: function() { return /* reexport module object */ _hu_js__WEBPACK_IMPORTED_MODULE_8__; },
/* harmony export */   id: function() { return /* reexport module object */ _id_js__WEBPACK_IMPORTED_MODULE_9__; },
/* harmony export */   it: function() { return /* reexport module object */ _it_js__WEBPACK_IMPORTED_MODULE_10__; },
/* harmony export */   ja: function() { return /* reexport module object */ _ja_js__WEBPACK_IMPORTED_MODULE_11__; },
/* harmony export */   ko: function() { return /* reexport module object */ _ko_js__WEBPACK_IMPORTED_MODULE_12__; },
/* harmony export */   mn: function() { return /* reexport module object */ _mn_js__WEBPACK_IMPORTED_MODULE_13__; },
/* harmony export */   nl: function() { return /* reexport module object */ _nl_js__WEBPACK_IMPORTED_MODULE_14__; },
/* harmony export */   pl: function() { return /* reexport module object */ _pl_js__WEBPACK_IMPORTED_MODULE_15__; },
/* harmony export */   pt_br: function() { return /* reexport module object */ _pt_br_js__WEBPACK_IMPORTED_MODULE_16__; },
/* harmony export */   ru: function() { return /* reexport module object */ _ru_js__WEBPACK_IMPORTED_MODULE_17__; },
/* harmony export */   tr: function() { return /* reexport module object */ _tr_js__WEBPACK_IMPORTED_MODULE_18__; },
/* harmony export */   zh_cn: function() { return /* reexport module object */ _zh_cn_js__WEBPACK_IMPORTED_MODULE_19__; },
/* harmony export */   zh_tw: function() { return /* reexport module object */ _zh_tw_js__WEBPACK_IMPORTED_MODULE_20__; }
/* harmony export */ });
/* harmony import */ var _ar_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(61593);
/* harmony import */ var _ar_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_ar_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _cs_cz_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(64458);
/* harmony import */ var _cs_cz_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_cs_cz_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _de_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(89601);
/* harmony import */ var _de_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_de_js__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _es_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(87710);
/* harmony import */ var _es_js__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_es_js__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _fa_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(15603);
/* harmony import */ var _fa_js__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_fa_js__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _fi_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(84059);
/* harmony import */ var _fi_js__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_fi_js__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _fr_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(13958);
/* harmony import */ var _fr_js__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(_fr_js__WEBPACK_IMPORTED_MODULE_6__);
/* harmony import */ var _he_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(18717);
/* harmony import */ var _he_js__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(_he_js__WEBPACK_IMPORTED_MODULE_7__);
/* harmony import */ var _hu_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(14765);
/* harmony import */ var _hu_js__WEBPACK_IMPORTED_MODULE_8___default = /*#__PURE__*/__webpack_require__.n(_hu_js__WEBPACK_IMPORTED_MODULE_8__);
/* harmony import */ var _id_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(77995);
/* harmony import */ var _id_js__WEBPACK_IMPORTED_MODULE_9___default = /*#__PURE__*/__webpack_require__.n(_id_js__WEBPACK_IMPORTED_MODULE_9__);
/* harmony import */ var _it_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(92315);
/* harmony import */ var _it_js__WEBPACK_IMPORTED_MODULE_10___default = /*#__PURE__*/__webpack_require__.n(_it_js__WEBPACK_IMPORTED_MODULE_10__);
/* harmony import */ var _ja_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(54711);
/* harmony import */ var _ja_js__WEBPACK_IMPORTED_MODULE_11___default = /*#__PURE__*/__webpack_require__.n(_ja_js__WEBPACK_IMPORTED_MODULE_11__);
/* harmony import */ var _ko_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(68632);
/* harmony import */ var _ko_js__WEBPACK_IMPORTED_MODULE_12___default = /*#__PURE__*/__webpack_require__.n(_ko_js__WEBPACK_IMPORTED_MODULE_12__);
/* harmony import */ var _mn_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(76769);
/* harmony import */ var _mn_js__WEBPACK_IMPORTED_MODULE_13___default = /*#__PURE__*/__webpack_require__.n(_mn_js__WEBPACK_IMPORTED_MODULE_13__);
/* harmony import */ var _nl_js__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(3424);
/* harmony import */ var _nl_js__WEBPACK_IMPORTED_MODULE_14___default = /*#__PURE__*/__webpack_require__.n(_nl_js__WEBPACK_IMPORTED_MODULE_14__);
/* harmony import */ var _pl_js__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(85454);
/* harmony import */ var _pl_js__WEBPACK_IMPORTED_MODULE_15___default = /*#__PURE__*/__webpack_require__.n(_pl_js__WEBPACK_IMPORTED_MODULE_15__);
/* harmony import */ var _pt_br_js__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(64149);
/* harmony import */ var _pt_br_js__WEBPACK_IMPORTED_MODULE_16___default = /*#__PURE__*/__webpack_require__.n(_pt_br_js__WEBPACK_IMPORTED_MODULE_16__);
/* harmony import */ var _ru_js__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(16491);
/* harmony import */ var _ru_js__WEBPACK_IMPORTED_MODULE_17___default = /*#__PURE__*/__webpack_require__.n(_ru_js__WEBPACK_IMPORTED_MODULE_17__);
/* harmony import */ var _tr_js__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(48948);
/* harmony import */ var _tr_js__WEBPACK_IMPORTED_MODULE_18___default = /*#__PURE__*/__webpack_require__.n(_tr_js__WEBPACK_IMPORTED_MODULE_18__);
/* harmony import */ var _zh_cn_js__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(84370);
/* harmony import */ var _zh_cn_js__WEBPACK_IMPORTED_MODULE_19___default = /*#__PURE__*/__webpack_require__.n(_zh_cn_js__WEBPACK_IMPORTED_MODULE_19__);
/* harmony import */ var _zh_tw_js__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(56646);
/* harmony import */ var _zh_tw_js__WEBPACK_IMPORTED_MODULE_20___default = /*#__PURE__*/__webpack_require__.n(_zh_tw_js__WEBPACK_IMPORTED_MODULE_20__);
/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
// @ts-nocheck
























/***/ }),

/***/ 92315:
/***/ (function(module) {

"use strict";

/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
module.exports = {
    newline: 'nuova riga',
    delete: 'eliminare',
    space: 'spazio',
    'Speech Recognize': 'Discorso Riconoscere',
    Sound: 'Suono',
    'Interim Results': 'Risultati intermedi'
};


/***/ }),

/***/ 54711:
/***/ (function(module) {

"use strict";

/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
module.exports = {
    newline: '改行',
    delete: '削除',
    space: 'スペース',
    'Speech Recognize': '音声認識',
    Sound: '音',
    'Interim Results': '中間結果'
};


/***/ }),

/***/ 68632:
/***/ (function(module) {

"use strict";

/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
module.exports = {
    newline: '줄 바꿈',
    delete: '삭제',
    space: '공간',
    'Speech Recognize': '음성 인식',
    Sound: '소리',
    'Interim Results': '중간 결과'
};


/***/ }),

/***/ 76769:
/***/ (function(module) {

"use strict";

/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
module.exports = {
    newline: 'Шинэ мөр',
    delete: 'Устгах',
    space: 'Зай',
    'Speech Recognize': 'Дуу хоолой таних',
    Sound: 'Дуу',
    'Interim Results': 'Түр зуурын үр дүн'
};


/***/ }),

/***/ 3424:
/***/ (function(module) {

"use strict";

/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
module.exports = {
    newline: 'regel',
    delete: 'verwijderen',
    space: 'ruimte',
    'Speech Recognize': 'Spraak Herkennen',
    Sound: 'Geluid',
    'Interim Results': 'Tussentijdse Resultaten'
};


/***/ }),

/***/ 85454:
/***/ (function(module) {

"use strict";

/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
module.exports = {
    newline: 'newline',
    delete: 'usunąć',
    space: 'przestrzeń',
    'Speech Recognize': 'Rozpoznawanie Mowy',
    Sound: 'Dźwięk',
    'Interim Results': 'Wyniki Okresowe'
};


/***/ }),

/***/ 64149:
/***/ (function(module) {

"use strict";

/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
module.exports = {
    newline: 'linha',
    delete: 'excluir',
    space: 'espaco',
    'Speech Recognize': 'Discurso Reconhecer',
    Sound: 'Som',
    'Interim Results': 'Resultados Provisórios'
};


/***/ }),

/***/ 16491:
/***/ (function(module) {

"use strict";

/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
module.exports = {
    newline: 'новая строка|перенос|энтер',
    delete: 'удалить',
    space: 'пробел',
    'Speech Recognize': 'Распознавание речи',
    Sound: 'Звук',
    'Interim Results': 'Промежуточные результаты'
};


/***/ }),

/***/ 48948:
/***/ (function(module) {

"use strict";

/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
module.exports = {
    newline: 'yeni satır',
    delete: 'silmek',
    space: 'uzay',
    'Speech Recognize': 'Konuşma Tanıma',
    Sound: 'Ses',
    'Interim Results': 'Ara Sonuçlar'
};


/***/ }),

/***/ 84370:
/***/ (function(module) {

"use strict";

/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
module.exports = {
    newline: '新行',
    delete: '删除',
    space: '空间',
    'Speech Recognize': '言语识别',
    Sound: '声音',
    'Interim Results': '中期业绩'
};


/***/ }),

/***/ 56646:
/***/ (function(module) {

"use strict";

/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
module.exports = {
    newline: '換行',
    delete: '刪除',
    space: '空白',
    'Speech Recognize': '語音辨識',
    Sound: '聲音',
    'Interim Results': '階段性辨識結果'
};


/***/ }),

/***/ 37873:
/***/ (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SpeechRecognizeNative: function() { return /* binding */ SpeechRecognizeNative; }
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(31635);
/* harmony import */ var jodit_core_decorators_debounce_debounce__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(37075);
/* harmony import */ var jodit_core_decorators_watch_watch__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(66927);
/* harmony import */ var jodit_core_dom_dom__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(55186);
/* harmony import */ var jodit_core_global__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(56298);
/* harmony import */ var jodit_core_helpers_utils_utils__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(84976);
/* harmony import */ var jodit_core_plugin__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(71005);
/* harmony import */ var _config__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(71096);
/* harmony import */ var _jodit__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(46173);
/* harmony import */ var _helpers_exec_spell_command__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(50834);
/* harmony import */ var _langs__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(25202);
/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */












class SpeechRecognizeNative extends jodit_core_plugin__WEBPACK_IMPORTED_MODULE_5__/* .Plugin */ .k {
    constructor(j) {
        super(j);
        this._commandToWord = {};
        if (j.o.speechRecognize.api) {
            j.registerButton({
                group: 'state',
                name: 'speechRecognize'
            });
        }
    }
    afterInit(jodit) {
        const { commands } = jodit.o.speechRecognize;
        if (commands) {
            (0,jodit_core_global__WEBPACK_IMPORTED_MODULE_3__/* .extendLang */ .JW)(_langs__WEBPACK_IMPORTED_MODULE_8__);
            (0,jodit_core_helpers_utils_utils__WEBPACK_IMPORTED_MODULE_4__/* .keys */ .HP)(commands, false).forEach(words => {
                const keys = words.split('|');
                keys.forEach(key => {
                    key = key.trim().toLowerCase();
                    this._commandToWord[key] = commands[words];
                    const translatedKeys = jodit.i18n(key);
                    if (translatedKeys !== key) {
                        translatedKeys.split('|').forEach(translatedKey => {
                            this._commandToWord[translatedKey.trim().toLowerCase()] = commands[words].trim();
                        });
                    }
                });
            });
        }
    }
    beforeDestruct(jodit) { }
    onSpeechRecognizeProgressResult(text) {
        if (!this.messagePopup) {
            this.messagePopup = this.j.create.div('jodit-speech-recognize__popup');
        }
        this.j.workplace.appendChild(this.messagePopup);
        this.j.async.setTimeout(() => {
            jodit_core_dom_dom__WEBPACK_IMPORTED_MODULE_2__/* .Dom */ .J.safeRemove(this.messagePopup);
        }, {
            label: 'onSpeechRecognizeProgressResult',
            timeout: 1000
        });
        this.messagePopup.innerText = text + '|';
    }
    onSpeechRecognizeResult(text) {
        const { j } = this, { s } = j;
        jodit_core_dom_dom__WEBPACK_IMPORTED_MODULE_2__/* .Dom */ .J.safeRemove(this.messagePopup);
        if (!this._checkCommand(text)) {
            const { range } = s, node = s.current();
            if (s.isCollapsed() &&
                jodit_core_dom_dom__WEBPACK_IMPORTED_MODULE_2__/* .Dom */ .J.isText(node) &&
                jodit_core_dom_dom__WEBPACK_IMPORTED_MODULE_2__/* .Dom */ .J.isOrContains(j.editor, node) &&
                node.nodeValue) {
                const sentence = node.nodeValue;
                node.nodeValue =
                    sentence +
                        (/[\u00A0 ]\uFEFF*$/.test(sentence) ? '' : ' ') +
                        text;
                range.setStartAfter(node);
                s.selectRange(range);
                j.synchronizeValues();
            }
            else {
                s.insertHTML(text);
            }
        }
    }
    _checkCommand(command) {
        command = command.toLowerCase().replace(/\./g, '');
        if (this._commandToWord[command]) {
            (0,_helpers_exec_spell_command__WEBPACK_IMPORTED_MODULE_9__/* .execSpellCommand */ .F)(this.j, this._commandToWord[command]);
            return true;
        }
        return false;
    }
}
(0,tslib__WEBPACK_IMPORTED_MODULE_10__/* .__decorate */ .Cg)([
    (0,jodit_core_decorators_watch_watch__WEBPACK_IMPORTED_MODULE_1__/* .watch */ .w)(':speechRecognizeProgressResult'),
    (0,jodit_core_decorators_debounce_debounce__WEBPACK_IMPORTED_MODULE_0__/* .debounce */ .s)()
], SpeechRecognizeNative.prototype, "onSpeechRecognizeProgressResult", null);
(0,tslib__WEBPACK_IMPORTED_MODULE_10__/* .__decorate */ .Cg)([
    (0,jodit_core_decorators_watch_watch__WEBPACK_IMPORTED_MODULE_1__/* .watch */ .w)(':speechRecognizeResult')
], SpeechRecognizeNative.prototype, "onSpeechRecognizeResult", null);
_jodit__WEBPACK_IMPORTED_MODULE_7__/* .Jodit */ .x.plugins.add('speech-recognize', SpeechRecognizeNative);


/***/ }),

/***/ 22227:
/***/ (function(module) {

module.exports = "<svg viewBox=\"0 0 16 16\" xml:space=\"preserve\" xmlns=\"http://www.w3.org/2000/svg\"> <path d=\"M8,11c1.657,0,3-1.343,3-3V3c0-1.657-1.343-3-3-3S5,1.343,5,3v5C5,9.657,6.343,11,8,11z\"/> <path d=\"M13,8V6h-1l0,1.844c0,1.92-1.282,3.688-3.164,4.071C6.266,12.438,4,10.479,4,8V6H3v2c0,2.414,1.721,4.434,4,4.899V15H5v1h6 v-1H9v-2.101C11.279,12.434,13,10.414,13,8z\"/> </svg>"

/***/ })

},
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ var __webpack_exec__ = function(moduleId) { return __webpack_require__(__webpack_require__.s = moduleId); }
/******/ var __webpack_exports__ = (__webpack_exec__(37873));
/******/ return __webpack_exports__;
/******/ }
]);
});