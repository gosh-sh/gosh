/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { pluginSystem } from "../../core/global.js";
import { normalizeSize } from "../../core/helpers/index.js";
import "./config.js";
/**
 * Process commands `fontsize` and `fontname`
 */
export function font(editor) {
    editor
        .registerButton({
        name: 'font',
        group: 'font'
    })
        .registerButton({
        name: 'fontsize',
        group: 'font'
    });
    const callback = (command, second, third) => {
        switch (command) {
            case 'fontsize':
                editor.s.commitStyle({
                    attributes: {
                        style: {
                            fontSize: normalizeSize(third, editor.o.defaultFontSizePoints)
                        }
                    }
                });
                break;
            case 'fontname':
                editor.s.commitStyle({
                    attributes: {
                        style: {
                            fontFamily: third
                        }
                    }
                });
                break;
        }
        editor.synchronizeValues();
        return false;
    };
    editor
        .registerCommand('fontsize', callback)
        .registerCommand('fontname', callback);
}
pluginSystem.add('font', font);
