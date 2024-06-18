/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { IS_IE, MODE_SOURCE, MODE_SPLIT } from "../../core/constants.js";
import { Icon } from "../../core/ui/icon.js";
import sourceIcon from "./source.svg.js";
import { Config } from "../../config.js";
Config.prototype.beautifyHTML = !IS_IE;
Config.prototype.sourceEditor = 'ace';
Config.prototype.sourceEditorNativeOptions = {
    /**
     * Show gutter
     */
    showGutter: true,
    /**
     * Default theme
     */
    theme: 'ace/theme/idle_fingers',
    /**
     * Default mode
     */
    mode: 'ace/mode/html',
    /**
     * Wrap lines. Possible values - "off", 80-100..., true, "free"
     */
    wrap: true,
    /**
     * Highlight active line
     */
    highlightActiveLine: true
};
Config.prototype.sourceEditorCDNUrlsJS = [
    'https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.2/ace.js'
];
Config.prototype.beautifyHTMLCDNUrlsJS = [
    'https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.14.4/beautify.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.14.4/beautify-html.min.js'
];
Icon.set('source', sourceIcon);
Config.prototype.controls.source = {
    mode: MODE_SPLIT,
    exec: (editor) => {
        editor.toggleMode();
    },
    isActive: (editor) => {
        return editor.getRealMode() === MODE_SOURCE;
    },
    tooltip: 'Change mode'
};
