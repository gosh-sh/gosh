/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
export class SourceEditor {
    constructor(jodit, container, toWYSIWYG, fromWYSIWYG) {
        this.jodit = jodit;
        this.container = container;
        this.toWYSIWYG = toWYSIWYG;
        this.fromWYSIWYG = fromWYSIWYG;
        this.className = '';
        this.isReady = false;
    }
    /**
     * Short alias for this.jodit
     */
    get j() {
        return this.jodit;
    }
    onReady() {
        this.replaceUndoManager();
        this.isReady = true;
        this.j.e.fire(this, 'ready');
    }
    onReadyAlways(onReady) {
        if (!this.isReady) {
            this.j.events?.on(this, 'ready', onReady);
        }
        else {
            onReady();
        }
    }
}
