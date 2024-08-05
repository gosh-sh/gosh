/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { pluginSystem } from "../../core/global.js";
import { normalizeColor } from "../../core/helpers/index.js";
import "./config.js";
/**
 * Process commands `background` and `forecolor`
 */
export function color(editor) {
    editor.registerButton({
        name: 'brush',
        group: 'color'
    });
    const callback = (command, second, third) => {
        const colorHEX = normalizeColor(third);
        switch (command) {
            case 'background':
                editor.s.commitStyle({
                    attributes: {
                        style: {
                            backgroundColor: !colorHEX
                                ? ''
                                : colorHEX
                        }
                    }
                });
                break;
            case 'forecolor':
                editor.s.commitStyle({
                    attributes: {
                        style: {
                            color: !colorHEX ? '' : colorHEX
                        }
                    }
                });
                break;
        }
        editor.synchronizeValues();
        return false;
    };
    editor
        .registerCommand('forecolor', callback)
        .registerCommand('background', callback);
}
pluginSystem.add('color', color);
