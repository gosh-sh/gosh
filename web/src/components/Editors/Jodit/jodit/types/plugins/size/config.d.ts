/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
declare module 'jodit/config' {
    interface Config {
        saveHeightInStorage: boolean;
        minWidth: number | string;
        minHeight: number | string;
        maxWidth: number | string;
        maxHeight: number | string;
    }
}
export {};
