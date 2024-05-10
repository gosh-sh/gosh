/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/speech-recognize
 */
import type { IDictionary } from "../../types";
import type { ISpeechRecognizeConstructor } from "./interface";
declare module 'jodit/config' {
    interface Config {
        speechRecognize: {
            readonly api: ISpeechRecognizeConstructor;
            /**
             * Returns and sets the language of the current SpeechRecognition.
             * If not specified, this defaults to the HTML lang attribute value, or
             * the user agent's language setting if that isn't set either.
             * @see https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/lang
             */
            readonly lang?: string;
            /**
             * Controls whether continuous results are returned for each recognition,
             * or only a single result.
             * @see https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/continuous
             */
            readonly continuous: boolean;
            /**
             * Controls whether interim results should be returned (true) or not (false.)
             * Interim results are results that are not yet final (e.g. the isFinal property is false.)
             * @see https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/interimResults
             */
            readonly interimResults: boolean;
            /**
             * On recognition error - make an error sound
             */
            readonly sound: boolean;
            /**
             * You can specify any commands in your language by listing them with the `|` sign.
             * In the value, write down any commands for
             * [execCommand](https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand#parameters)
             * and value (separated by ::)
             * You can also use [custom Jodit commands](#need-article)
             * For example
             * ```js
             * Jodit.make('#editor', {
             *   speechRecognize: {
             *     commands: {
             *       'remove line|remove paragraph': 'backspaceSentenceButton',
             *       'start bold': 'bold',
             *       'insert table|create table': 'insertHTML::<table><tr><td>test</td></tr></table>',
             *     }
             *   }
             * });
             * ```
             */
            readonly commands: IDictionary<string>;
        };
    }
}
