/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { KEY_ESC } from "../../core/constants.js";
import { pluginSystem } from "../../core/global.js";
import { isArray, isString, keys, normalizeKeyAliases } from "../../core/helpers/index.js";
import { Plugin } from "../../core/plugin/index.js";
import "./config.js";
/**
 * Allow set hotkey for command or button
 */
export class hotkeys extends Plugin {
    constructor() {
        super(...arguments);
        this.onKeyPress = (event) => {
            const special = this.specialKeys[event.which], character = (event.key || String.fromCharCode(event.which)).toLowerCase();
            const modif = [special || character];
            ['alt', 'ctrl', 'shift', 'meta'].forEach(specialKey => {
                if (event[specialKey + 'Key'] && special !== specialKey) {
                    modif.push(specialKey);
                }
            });
            return normalizeKeyAliases(modif.join('+'));
        };
        this.specialKeys = {
            8: 'backspace',
            9: 'tab',
            10: 'return',
            13: 'return',
            16: 'shift',
            17: 'ctrl',
            18: 'alt',
            19: 'pause',
            20: 'capslock',
            27: 'esc',
            32: 'space',
            33: 'pageup',
            34: 'pagedown',
            35: 'end',
            36: 'home',
            37: 'left',
            38: 'up',
            39: 'right',
            40: 'down',
            45: 'insert',
            46: 'del',
            59: ';',
            61: '=',
            91: 'meta',
            96: '0',
            97: '1',
            98: '2',
            99: '3',
            100: '4',
            101: '5',
            102: '6',
            103: '7',
            104: '8',
            105: '9',
            106: '*',
            107: '+',
            109: '-',
            110: '.',
            111: '/',
            112: 'f1',
            113: 'f2',
            114: 'f3',
            115: 'f4',
            116: 'f5',
            117: 'f6',
            118: 'f7',
            119: 'f8',
            120: 'f9',
            121: 'f10',
            122: 'f11',
            123: 'f12',
            144: 'numlock',
            145: 'scroll',
            173: '-',
            186: ';',
            187: '=',
            188: ',',
            189: '-',
            190: '.',
            191: '/',
            192: '`',
            219: '[',
            220: '\\',
            221: ']',
            222: "'"
        };
    }
    /** @override */
    afterInit(editor) {
        keys(editor.o.commandToHotkeys, false).forEach((commandName) => {
            const shortcuts = editor.o.commandToHotkeys[commandName];
            if (shortcuts && (isArray(shortcuts) || isString(shortcuts))) {
                editor.registerHotkeyToCommand(shortcuts, commandName);
            }
        });
        let itIsHotkey = false;
        editor.e
            .off('.hotkeys')
            .on([editor.ow, editor.ew], 'keydown.hotkeys', (e) => {
            if (e.key === KEY_ESC) {
                return this.j.e.fire('escape', e);
            }
        })
            .on('keydown.hotkeys', (event) => {
            const shortcut = this.onKeyPress(event), stop = {
                shouldStop: true
            };
            const resultOfFire = this.j.e.fire(shortcut + '.hotkey', event.type, stop);
            if (resultOfFire === false) {
                if (stop.shouldStop) {
                    itIsHotkey = true;
                    editor.e.stopPropagation('keydown');
                    return false;
                }
                else {
                    event.preventDefault();
                }
            }
        }, { top: true })
            .on('keyup.hotkeys', () => {
            if (itIsHotkey) {
                itIsHotkey = false;
                editor.e.stopPropagation('keyup');
                return false;
            }
        }, { top: true });
    }
    /** @override */
    beforeDestruct(jodit) {
        if (jodit.events) {
            jodit.e.off('.hotkeys');
        }
    }
}
pluginSystem.add('hotkeys', hotkeys);
