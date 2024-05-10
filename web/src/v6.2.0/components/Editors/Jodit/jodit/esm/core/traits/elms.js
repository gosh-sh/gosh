/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { toArray } from "../helpers/array/to-array.js";
export class Elms {
    /**
     * Return element with BEM class name
     */
    getElm(elementName) {
        return this.container.querySelector(`.${this.getFullElName(elementName)}`);
    }
    /**
     * Return elements with BEM class name
     */
    getElms(elementName) {
        return toArray(this.container.querySelectorAll(`.${this.getFullElName(elementName)}`));
    }
}
