/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { INVISIBLE_SPACE_REG_EXP, SPACE_REG_EXP } from "../../core/constants.js";
import { Dom } from "../../core/dom/dom.js";
import { pluginSystem } from "../../core/global.js";
import { Plugin } from "../../core/plugin/plugin.js";
import "./config.js";
/**
 * Show stat data - words and chars count
 */
export class stat extends Plugin {
    constructor() {
        super(...arguments);
        this.charCounter = null;
        this.wordCounter = null;
        this.reInit = () => {
            if (this.j.o.showCharsCounter && this.charCounter) {
                this.j.statusbar.append(this.charCounter, true);
            }
            if (this.j.o.showWordsCounter && this.wordCounter) {
                this.j.statusbar.append(this.wordCounter, true);
            }
            this.j.e.off('change keyup', this.calc).on('change keyup', this.calc);
            this.calc();
        };
        this.calc = this.j.async.throttle(() => {
            const text = this.j.text;
            if (this.j.o.showCharsCounter && this.charCounter) {
                const chars = this.j.o.countHTMLChars
                    ? this.j.value
                    : text.replace(SPACE_REG_EXP(), '');
                this.charCounter.textContent = this.j.i18n('Chars: %d', chars.length);
            }
            if (this.j.o.showWordsCounter && this.wordCounter) {
                this.wordCounter.textContent = this.j.i18n('Words: %d', text
                    .replace(INVISIBLE_SPACE_REG_EXP(), '')
                    .split(SPACE_REG_EXP())
                    .filter((e) => e.length).length);
            }
        }, this.j.defaultTimeout);
    }
    /** @override */
    afterInit() {
        this.charCounter = this.j.c.span();
        this.wordCounter = this.j.c.span();
        this.j.e.on('afterInit changePlace afterAddPlace', this.reInit);
        this.reInit();
    }
    /** @override */
    beforeDestruct() {
        Dom.safeRemove(this.charCounter);
        Dom.safeRemove(this.wordCounter);
        this.j.e.off('afterInit changePlace afterAddPlace', this.reInit);
        this.charCounter = null;
        this.wordCounter = null;
    }
}
pluginSystem.add('stat', stat);
