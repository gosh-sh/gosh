/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/paste
 */
import type { HTMLTagNames, IUIOption } from "../../types";
declare module 'jodit/config' {
    interface Config {
        /**
         * Ask before paste HTML in WYSIWYG mode
         */
        askBeforePasteHTML: boolean;
        /**
         * When the user inserts a snippet of HTML, the plugin will prompt for the insertion method.
         * If the user inserts the same fragment again, the previously selected option will be used without prompting for confirmation.
         */
        memorizeChoiceWhenPasteFragment: boolean;
        /**
         * Handle pasted text - similar to HTML
         */
        processPasteHTML: boolean;
        /**
         * Inserts HTML line breaks before all newlines in a string
         */
        nl2brInPlainText: boolean;
        /**
         * List of tags that will not be removed from the pasted HTML with INSERT_AS_TEXT mode
         */
        pasteExcludeStripTags: HTMLTagNames[];
        /**
         * Options when inserting HTML string
         */
        pasteHTMLActionList: IUIOption[];
        /**
         * Scroll the editor to the pasted fragment
         */
        scrollToPastedContent: boolean;
    }
}
