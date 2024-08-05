/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../dom/dom.js";
import { UIElement } from "../element.js";
export class ProgressBar extends UIElement {
    /** @override */
    className() {
        return 'ProgressBar';
    }
    /** @override */
    render() {
        return '<div><div></div></div>';
    }
    /**
     * Show progress bar
     */
    show() {
        const container = this.j.workplace || this.j.container;
        container.appendChild(this.container);
        return this;
    }
    hide() {
        Dom.safeRemove(this.container);
        return this;
    }
    progress(percentage) {
        this.container.style.width = percentage.toFixed(2) + '%';
        return this;
    }
    destruct() {
        this.hide();
        return super.destruct();
    }
}
