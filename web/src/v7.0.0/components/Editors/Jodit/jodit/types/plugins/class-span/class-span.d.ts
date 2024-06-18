/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/class-span/README.md]]
 * @packageDocumentation
 * @module plugins/class-span
 */
import type { IJodit } from "../../types";
import { Plugin } from "../../core/plugin";
/**
 * Applying some className to selected text.
 * @example
 * ```js
 * const editor = Jodit.make('#editor', {
 *	controls: {
 *		classSpan: {
 *			list: {
 *				class1: 'Classe 1',
 *				class2: 'Classe 2',
 *				class3: 'Classe 3',
 *				class4: 'Classe 4',
 *				class5: 'Classe 5'
 *			}
 *		}
 *	}
 * });
 * ```
 */
export declare class classSpan extends Plugin {
    /** @override */
    buttons: Plugin['buttons'];
    /** @override */
    protected afterInit(jodit: IJodit): void;
    /** @override */
    protected beforeDestruct(): void;
}
