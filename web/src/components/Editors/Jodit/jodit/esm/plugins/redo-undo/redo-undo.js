/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import * as consts from "../../core/constants.js";
import { pluginSystem } from "../../core/global.js";
import { Plugin } from "../../core/plugin/plugin.js";
import { Icon } from "../../core/ui/icon.js";
import redoIcon from "./icons/redo.svg.js";
import undoIcon from "./icons/undo.svg.js";
import { Config } from "../../config.js";
Icon.set('redo', redoIcon).set('undo', undoIcon);
Config.prototype.controls.redo = {
    mode: consts.MODE_SPLIT,
    isDisabled: (editor) => !editor.history.canRedo(),
    tooltip: 'Redo'
};
Config.prototype.controls.undo = {
    mode: consts.MODE_SPLIT,
    isDisabled: (editor) => !editor.history.canUndo(),
    tooltip: 'Undo'
};
/**
 * Custom process Redo and Undo functionality
 */
export class redoUndo extends Plugin {
    constructor() {
        super(...arguments);
        /** @override */
        this.buttons = [
            {
                name: 'undo',
                group: 'history'
            },
            {
                name: 'redo',
                group: 'history'
            }
        ];
    }
    beforeDestruct() {
        // do nothing
    }
    afterInit(editor) {
        const callback = (command) => {
            editor.history[command]();
            return false;
        };
        editor.registerCommand('redo', {
            exec: callback,
            hotkeys: ['ctrl+y', 'ctrl+shift+z', 'cmd+y', 'cmd+shift+z']
        });
        editor.registerCommand('undo', {
            exec: callback,
            hotkeys: ['ctrl+z', 'cmd+z']
        });
    }
}
pluginSystem.add('redoUndo', redoUndo);
