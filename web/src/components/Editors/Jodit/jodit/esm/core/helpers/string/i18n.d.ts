/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module helpers/string
 */
import type { ILanguageOptions } from "../../../types";
/**
 * Simple variant sprintf function
 */
export declare const sprintf: (str: string, args?: Array<string | number>) => string;
/**
 * Internationalization method. Uses Jodit.lang object
 * @example
 * ```javascript
 * var editor = Jodit.make("#redactor", {
 *      language: 'ru'
 * });
 * console.log(editor.i18n('Cancel')) //Отмена;
 *
 * Jodit.defaultOptions.language = 'ru';
 * console.log(Jodit.prototype.i18n('Cancel')) //Отмена
 *
 * Jodit.lang.cs = {
 *    Cancel: 'Zrušit'
 * };
 * Jodit.defaultOptions.language = 'cs';
 * console.log(Jodit.prototype.i18n('Cancel')) //Zrušit
 *
 * Jodit.lang.cs = {
 *    'Hello world': 'Hello \s Good \s'
 * };
 * Jodit.defaultOptions.language = 'cs';
 * console.log(Jodit.prototype.i18n('Hello world', 'mr.Perkins', 'day')) //Hello mr.Perkins Good day
 * ```
 */
export declare function i18n(key: string, params?: Array<string | number>, options?: ILanguageOptions): string;
