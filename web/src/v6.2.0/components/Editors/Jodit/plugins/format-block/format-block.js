/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { pluginSystem } from "../../jodit/esm/core/global.js";
import "./config";
/**
 * Process command - `formatblockpro`
 */
export function formatBlockPro(editor) {
    editor.registerButton({
        name: 'paragraphpro',
        group: 'font'
    });
    editor.registerCommand('formatblockpro', (command, second, third) => {
        editor.s.commitStyle({
            element: third
        });
        editor.synchronizeValues();
        return false;
    });
}
pluginSystem.add('formatBlockPro', formatBlockPro);
