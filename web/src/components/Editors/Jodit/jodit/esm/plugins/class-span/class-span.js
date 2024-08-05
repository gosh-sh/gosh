/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../core/dom/dom.js";
import { pluginSystem } from "../../core/global.js";
import { memorizeExec } from "../../core/helpers/utils/utils.js";
import { Plugin } from "../../core/plugin/index.js";
import { Icon } from "../../core/ui/icon.js";
import classSpanIcon from "./class-span.svg.js";
import { Config } from "../../config.js";
Config.prototype.controls.classSpan = {
    command: 'applyClassName',
    exec: memorizeExec,
    list: [
        'enabled',
        'disabled',
        'activated',
        'text-left',
        'text-center',
        'text-right',
        'warning',
        'error'
    ],
    isChildActive: (editor, button) => {
        const current = editor.s.current();
        if (current) {
            const currentBpx = Dom.closest(current, Dom.isElement, editor.editor) || editor.editor;
            return Boolean(button.control.args &&
                currentBpx.classList.contains(button.control.args[0].toString()));
        }
        return false;
    },
    isActive: (editor, btn) => {
        const current = editor.s.current();
        if (current) {
            const currentBpx = Dom.closest(current, Dom.isElement, editor.editor) || editor.editor;
            let present = false;
            btn.control.list &&
                Object.keys(btn.control.list).forEach((className) => {
                    if (currentBpx.classList.contains(className)) {
                        present = true;
                    }
                });
            return Boolean(currentBpx &&
                currentBpx !== editor.editor &&
                btn.control.list !== undefined &&
                present);
        }
        return false;
    },
    childTemplate: (e, key, value) => `<span class="${key}">${e.i18n(value)}</span>`,
    tooltip: 'Insert className'
};
/**
 * Applying some className to selected text.
 * @example
 * ```js
 * const editor = Jodit.make('#editor', {
 *	controls: {
 *		classSpan: {
 *			list: {
 *				class1: 'Classe 1',
 *				class2: 'Classe 2',
 *				class3: 'Classe 3',
 *				class4: 'Classe 4',
 *				class5: 'Classe 5'
 *			}
 *		}
 *	}
 * });
 * ```
 */
export class classSpan extends Plugin {
    constructor() {
        super(...arguments);
        /** @override */
        this.buttons = [
            {
                name: 'classSpan',
                group: 'script'
            }
        ];
    }
    /** @override */
    afterInit(jodit) {
        jodit.registerCommand('applyClassName', (command, second, third) => {
            jodit.s.commitStyle({
                attributes: {
                    ['class']: third
                }
            });
            return false;
        });
    }
    /** @override */
    beforeDestruct() { }
}
pluginSystem.add('classSpan', classSpan);
Icon.set('class-span', classSpanIcon);
