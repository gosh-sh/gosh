/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/source
 */
import type { CallbackFunction, IJodit } from "../../../types";
export declare abstract class SourceEditor<T> {
    readonly jodit: IJodit;
    readonly container: HTMLElement;
    readonly toWYSIWYG: CallbackFunction;
    readonly fromWYSIWYG: CallbackFunction;
    instance: T;
    className: string;
    constructor(jodit: IJodit, container: HTMLElement, toWYSIWYG: CallbackFunction, fromWYSIWYG: CallbackFunction);
    /**
     * Short alias for this.jodit
     */
    get j(): this['jodit'];
    abstract init(editor: IJodit): void;
    abstract replaceUndoManager(): void;
    isReady: boolean;
    protected onReady(): void;
    onReadyAlways(onReady: CallbackFunction): void;
}
