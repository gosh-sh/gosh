/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
declare module 'jodit/config' {
    interface Config {
        /**
         * You can redefine default page
         *
         * @example
         * ```javascript
         * Jodit.make('#editor', {
         *    iframe: true,
         *    iframeDefaultSrc: 'https://xdsoft.net/jodit/docs/',
         * });
         * ```
         */
        iframeDefaultSrc: string;
        /**
         * Base URL where the root directory for [[Config.iframe]] mode
         *
         * @example
         * ```javascript
         * new Jodit('#editor', {
         *    iframe: true,
         *    iframeBaseUrl: 'https://xdsoft.net/jodit/docs/',
         * });
         * ```
         */
        iframeBaseUrl: string;
        /**
         * Iframe title's content
         */
        iframeTitle: string;
        /**
         * Iframe's DOCTYPE
         */
        iframeDoctype: string;
        /**
         * Custom style to be used inside the iframe to display content.
         * @example
         * ```javascript
         * new Jodit('#editor', {
         *    iframe: true,
         *    iframeStyle: 'html{margin: 0px;}',
         * })
         * ```
         */
        iframeStyle: string;
        /**
         * Custom stylesheet files to be used inside the iframe to display content.
         *
         * @example
         * ```javascript
         * new Jodit('#editor', {
         *    iframe: true,
         *    iframeCSSLinks: ['styles/default.css'],
         * })
         * ```
         */
        iframeCSSLinks: string[];
    }
}
export {};
