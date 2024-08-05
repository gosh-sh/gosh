/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/backspace
 */
import { Config } from "../../config.js";
Config.prototype.delete = {
    hotkeys: {
        delete: ['delete', 'cmd+backspace'],
        deleteWord: ['ctrl+delete', 'cmd+alt+backspace', 'ctrl+alt+backspace'],
        deleteSentence: ['ctrl+shift+delete', 'cmd+shift+delete'],
        backspace: ['backspace'],
        backspaceWord: ['ctrl+backspace'],
        backspaceSentence: ['ctrl+shift+backspace', 'cmd+shift+backspace']
    }
};
