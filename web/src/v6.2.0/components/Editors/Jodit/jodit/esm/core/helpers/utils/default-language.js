/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module helpers/utils
 */
import { isString } from "../checker/is-string.js";
/**
 * Try define user language
 */
export const defaultLanguage = (language, defaultLanguage = 'en') => {
    if (language !== 'auto' && isString(language)) {
        return language;
    }
    if (document.documentElement && document.documentElement.lang) {
        return document.documentElement.lang;
    }
    if (navigator.language) {
        return navigator.language.substring(0, 2);
    }
    return defaultLanguage;
};
