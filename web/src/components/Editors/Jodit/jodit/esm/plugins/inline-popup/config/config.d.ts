/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/inline-popup
 */
import type { IControlType, IDictionary, IJodit } from "../../../types";
declare module 'jodit/config' {
    interface Config {
        popup: IDictionary<Array<IControlType | string> | ((editor: IJodit, target: HTMLElement | undefined, close: () => void) => Array<IControlType | string> | HTMLElement | string)>;
        toolbarInlineDisabledButtons: string[];
        toolbarInline: boolean;
        toolbarInlineForSelection: boolean;
        toolbarInlineDisableFor: string | string[];
    }
}
