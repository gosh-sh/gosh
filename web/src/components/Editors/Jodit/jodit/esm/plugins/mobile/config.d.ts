/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/mobile
 */
import type { ButtonsOption } from "../../types";
declare module 'jodit/config' {
    interface Config {
        /**
         * Mobile timeout for CLICK emulation
         */
        mobileTapTimeout: number;
        /**
         * After resizing, the set of buttons will change to accommodate different sizes.
         */
        toolbarAdaptive: boolean;
        /**
         * The list of buttons that appear in the editor's toolbar for medium-sized spaces (≥ options.sizeMD).
         */
        buttonsMD: ButtonsOption;
        /**
         * The list of buttons that appear in the editor's toolbar for small-sized spaces (≥ options.sizeSM).
         */
        buttonsSM: ButtonsOption;
        /**
         * The list of buttons that appear in the editor's toolbar for extra-small spaces (less than options.sizeSM).
         */
        buttonsXS: ButtonsOption;
    }
}
