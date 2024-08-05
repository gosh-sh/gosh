/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/source
 */
import type { IJodit, ISourceEditor } from "../../types";
declare module 'jodit/config' {
    interface Config {
        sourceEditor: 'area' | 'ace' | ((jodit: IJodit) => ISourceEditor);
        /**
         * Options for [ace](https://ace.c9.io/#config) editor
         * @example
         * ```js
         * Jodit.make('#editor', {
         * 	showGutter: true,
         * 	theme: 'ace/theme/idle_fingers',
         * 	mode: 'ace/mode/html',
         * 	wrap: true,
§		 * 	highlightActiveLine: true
         * })
         * ```
         */
        sourceEditorNativeOptions: {
            showGutter: boolean;
            theme: string;
            mode: string;
            wrap: string | boolean | number;
            highlightActiveLine: boolean;
        };
        /**
         * Beautify HTML then it possible
         */
        beautifyHTML: boolean;
        /**
         * CDN URLs for HTML Beautifier
         */
        beautifyHTMLCDNUrlsJS: string[];
        /**
         * CDN URLs for ACE editor
         */
        sourceEditorCDNUrlsJS: string[];
    }
}
