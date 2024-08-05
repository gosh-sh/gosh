/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { pluginSystem } from "../../core/global.js";
import "./config.js";
export function table(editor) {
    editor.registerButton({
        name: 'table',
        group: 'insert'
    });
}
pluginSystem.add('table', table);
