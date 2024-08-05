/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/paste-from-word
 */
import type { InsertMode, IUIOption } from "../../types";
declare module 'jodit/config' {
    interface Config {
        /**
         * Show the paste dialog if the html is similar to what MSWord gives when copying.
         */
        askBeforePasteFromWord: boolean;
        /**
         * Handle pasting of HTML - similar to a fragment copied from MSWord
         */
        processPasteFromWord: boolean;
        /**
         * Default insert method from word, if not define, it will use defaultActionOnPaste instead
         *
         * ```js
         * Jodit.make('#editor', {
         *   defaultActionOnPasteFromWord: 'insert_clear_html'
         * })
         * ```
         */
        defaultActionOnPasteFromWord: InsertMode | null;
        /**
         * Options when inserting data from Word
         */
        pasteFromWordActionList: IUIOption[];
    }
}
