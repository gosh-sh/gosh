/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/powered-by-jodit/README.md]]
 * @packageDocumentation
 * @module plugins/powered-by-jodit
 */
import type { IJodit } from "../../types";
declare module 'jodit/config' {
    interface Config {
        /**
         * Hide the link to the Jodit site at the bottom of the editor
         */
        hidePoweredByJodit: boolean;
    }
}
export declare function poweredByJodit(jodit: IJodit): void;
