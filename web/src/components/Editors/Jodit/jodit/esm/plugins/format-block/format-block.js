/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { pluginSystem } from "../../core/global.js";
import "./config.js";
/**
 * Process command - `formatblock`
 */
export function formatBlock(editor) {
    editor.registerButton({
        name: 'paragraph',
        group: 'font'
    });
    editor.registerCommand('formatblock', (command, second, third) => {
        editor.s.commitStyle({
            element: third
        });
        editor.synchronizeValues();
        return false;
    });
}
pluginSystem.add('formatBlock', formatBlock);
