/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */

declare module 'jodit/config' {
    interface Config {
        /**
         * Open WYSIWYG in full screen
         * @example
         * ```javascript
         * var editor = Jodit.make({
         *     fullsize: true // fullsize editor
         * });
         * ```
         * @example
         * ```javascript
         * var editor = Jodit.make();
         * editor.e.fire('toggleFullSize');
         * editor.e.fire('toggleFullSize', true); // fullsize
         * editor.e.fire('toggleFullSize', false); // usual mode
         * ```
         */
        fullsize: boolean;
        /**
         * True, after `fullsize` -  all editors elements above jodit will get `jodit_fullsize-box_true` class (z-index: 100000 !important;)
         */
        globalFullSize: boolean;
    }
}
