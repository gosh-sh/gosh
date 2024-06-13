/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
declare module 'jodit/config' {
    interface Config {
        delete: {
            hotkeys: {
                delete: string[];
                deleteWord: string[];
                deleteSentence: string[];
                backspace: string[];
                backspaceWord: string[];
                backspaceSentence: string[];
            };
        };
    }
}
export {};
