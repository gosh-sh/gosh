/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { pluginSystem } from "../../jodit/esm/core/global.js";
import { normalizeSize } from "../../jodit/esm/core/helpers/index.js";
import "./config";
/**
 * Process commands `font-size` and `font-family`
 */
export function fonts(editor) {
    const callback = (command, second, third) => {
        console.log(third);
        switch (command) {
            case 'font-size':
                editor.s.commitStyle({
                    attributes: {
                        style: {
                            fontSize: normalizeSize(third, editor.o.defaultFontSizePoints)
                        }
                    }
                });
                break;
            case 'font-family':
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
        .registerCommand('font-size', callback)
        .registerCommand('font-family', callback);
}
pluginSystem.add('fonts', fonts);
