/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Component } from "./component.js";
export class ViewComponent extends Component {
    /**
     * Shortcut for `this.jodit`
     */
    get j() {
        return this.jodit;
    }
    get defaultTimeout() {
        return this.j.defaultTimeout;
    }
    i18n(text, ...params) {
        return this.j.i18n(text, ...params);
    }
    /**
     * Attach component to View
     */
    setParentView(jodit) {
        this.jodit = jodit;
        jodit.components.add(this);
        return this;
    }
    constructor(jodit) {
        super();
        this.setParentView(jodit);
    }
    /** @override */
    destruct() {
        this.j.components.delete(this);
        return super.destruct();
    }
}
