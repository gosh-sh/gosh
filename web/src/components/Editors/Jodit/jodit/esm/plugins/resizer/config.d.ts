/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/resizer
 */
import type { HTMLTagNames } from "../../types";
declare module 'jodit/config' {
    interface Config {
        /**
         * Use true frame for editing iframe size
         */
        allowResizeTags: Set<HTMLTagNames>;
        resizer: {
            /**
             * Show size
             */
            showSize: boolean;
            hideSizeTimeout: number;
            /**
             * Save width and height proportions when resizing
             * ```js
             * Jodit.make('#editor', {
             *   allowResizeTags: ['img', 'iframe', 'table', 'jodit'],
             *   resizer: {
             *     useAspectRatio: false, // don't save,
             *     useAspectRatio: ['img'], // save only for images (default value)
             *     useAspectRatio: true // save for all
             *   }
             * });
             * ```
             */
            useAspectRatio: boolean | Set<HTMLTagNames>;
            /**
             * When resizing images, change not the styles but the width and height attributes
             */
            forImageChangeAttributes: boolean;
            /**
             * The minimum width for the editable element
             */
            min_width: number;
            /**
             * The minimum height for the item being edited
             */
            min_height: number;
        };
    }
}
