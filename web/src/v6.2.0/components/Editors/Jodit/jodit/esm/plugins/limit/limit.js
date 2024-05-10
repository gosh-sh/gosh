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
import { COMMAND_KEYS, INVISIBLE_SPACE_REG_EXP, SPACE_REG_EXP } from "../../core/constants.js";
import { autobind } from "../../core/decorators/index.js";
import { pluginSystem } from "../../core/global.js";
import { Plugin } from "../../core/plugin/index.js";
import "./config.js";
/**
 * Plugin control for chars or words count
 */
export class limit extends Plugin {
    /** @override **/
    afterInit(jodit) {
        const { limitWords, limitChars } = jodit.o;
        if (jodit && (limitWords || limitChars)) {
            let snapshot = null;
            jodit.e
                .off('.limit')
                .on('beforePaste.limit', () => {
                snapshot = jodit.history.snapshot.make();
            })
                .on('keydown.limit keyup.limit beforeEnter.limit', this.checkPreventKeyPressOrPaste)
                .on('change.limit', this.checkPreventChanging)
                .on('afterPaste.limit', () => {
                if (this.__shouldDenyInput(true) && snapshot) {
                    jodit.history.snapshot.restore(snapshot);
                    jodit.e.fire('denyPaste.limit');
                    return false;
                }
            });
        }
    }
    /**
     * Action should be prevented
     */
    shouldPreventInsertHTML(event) {
        if (event &&
            (COMMAND_KEYS.includes(event.key) || event.ctrlKey || event.metaKey)) {
            return false;
        }
        return this.__shouldDenyInput(false);
    }
    __shouldDenyInput(strict) {
        const { jodit } = this;
        const { limitWords, limitChars } = jodit.o;
        const text = jodit.o.limitHTML ? jodit.value : jodit.text;
        const words = this.__splitWords(text);
        if (limitWords && isGt(words.length, limitWords, strict)) {
            jodit.e.fire('denyWords.limit limit.limit');
            return true;
        }
        const should = Boolean(limitChars && isGt(words.join('').length, limitChars, strict));
        if (should) {
            jodit.e.fire('denyChars.limit limit.limit');
        }
        return should;
    }
    /**
     * Check if some keypress or paste should be prevented
     */
    checkPreventKeyPressOrPaste(event) {
        if (this.shouldPreventInsertHTML(event)) {
            return false;
        }
    }
    /**
     * Check if some external changing should be prevented
     */
    checkPreventChanging(newValue, oldValue) {
        const { jodit } = this;
        if (this.__shouldDenyInput(true)) {
            jodit.value = oldValue;
        }
    }
    /**
     * Split text on words without technical characters
     */
    __splitWords(text) {
        return text
            .replace(INVISIBLE_SPACE_REG_EXP(), '')
            .split(SPACE_REG_EXP())
            .filter(e => e.length);
    }
    /** @override **/
    beforeDestruct(jodit) {
        jodit.e.off('.limit');
    }
}
__decorate([
    autobind
], limit.prototype, "checkPreventKeyPressOrPaste", null);
__decorate([
    autobind
], limit.prototype, "checkPreventChanging", null);
function isGt(a, b, strict) {
    return strict ? a > b : a >= b;
}
pluginSystem.add('limit', limit);
