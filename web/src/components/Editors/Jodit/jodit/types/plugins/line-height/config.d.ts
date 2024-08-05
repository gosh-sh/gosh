/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
declare module 'jodit/config' {
    interface Config {
        /**
         * Default line spacing for the entire editor
         *
         * ```js
         * Jodit.make('#editor', {
         *   defaultLineHeight: 1.2
         * })
         * ```
         */
        defaultLineHeight: number | null;
    }
}
export {};
