/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { pluginSystem } from "../../core/global.js";
import "./config.js";
function video(editor) {
    editor.registerButton({
        name: 'video',
        group: 'media'
    });
}
pluginSystem.add('video', video);
