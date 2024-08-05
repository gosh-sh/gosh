/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/image-properties/README.md]]
 * @packageDocumentation
 * @module plugins/image-properties
 */
import type { IJodit } from "../../types";
import { Plugin } from "../../core/plugin/plugin";
import "./config";
import type { ImagePropertiesState } from "./interface";
/**
 * Plug-in for image editing window
 *
 * @example
 * ```javascript
 * const editor = Jodit.make('#editor', {
 *     image: {
 *         editSrc: false,
 *         editLink: false
 *     }
 * });
 * ```
 */
/**
 * Show dialog with image's options
 */
export declare class imageProperties extends Plugin {
    protected state: ImagePropertiesState;
    private activeTabState;
    private get form();
    /**
     * Dialog for form
     */
    private get dialog();
    private get __buttons();
    /**
     * Open dialog editing image properties
     *
     * @example
     * ```javascript
     * const editor = Jodit.makeJodit('#editor');
     *     img = editor.createInside.element('img');
     *
     * img.setAttribute('src', 'images/some-image.png');
     * editor.s.insertImage(img);
     * // open the properties of the editing window
     * editor.events.fire('openImageProperties', img);
     * ```
     */
    protected open(): void | false;
    private __lock;
    private __unlock;
    /** @override **/
    protected afterInit(editor: IJodit): void;
    protected onStateValuesImageSrcChange(): Promise<void>;
    /** @override */
    protected beforeDestruct(editor: IJodit): void;
}
