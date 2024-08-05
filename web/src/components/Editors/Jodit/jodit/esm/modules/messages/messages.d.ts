/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:modules/messages/README.md]]
 * @packageDocumentation
 * @module modules/messages
 */
import type { IMessages, IViewBased, MessageVariant } from "../../types";
import { UIGroup } from "../../core/ui/group/group";

/**
 * Plugin display pop-up messages in the lower right corner of the editor
 */
export declare class UIMessages extends UIGroup implements IMessages {
    private readonly __box;
    readonly options: {
        defaultTimeout: number;
        defaultOffset: number;
    };
    className(): string;
    constructor(jodit: IViewBased, __box: HTMLElement, options?: {
        defaultTimeout: number;
        defaultOffset: number;
    });
    /**
     * Show popup info message in the lower right corner of the container
     * ```js
     * const jodit = Jodit.make('#editor');
     * jodit.info('Hello world', 3000);
     * ```
     */
    info(text: string, timeout?: number): void;
    /**
     * Show popup success message in the lower right corner of the container
     * ```js
     * const jodit = Jodit.make('#editor');
     * jodit.success('Hello world', 3000);
     * ```
     */
    success(text: string, timeout?: number): void;
    /**
     * Show popup error message in the lower right corner of the container
     * ```js
     * const jodit = Jodit.make('#editor');
     * jodit.error('Hello world', 3000);
     * ```
     */
    error(text: string, timeout?: number): void;
    /**
     * Show popup message in the lower right corner of the container
     * ```js
     * const jodit = Jodit.make('#editor');
     * jodit.message('Hello world', 'info', 3000);
     * ```
     */
    message(text: string, variant?: MessageVariant, timeout?: number): void;
    private __message;
    private __getRemoveCallback;
    private __messages;
    private __calcOffsets;
}
