/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
        r = Reflect.decorate(decorators, target, key, desc);
    else
        for (var i = decorators.length - 1; i >= 0; i--)
            if (d = decorators[i])
                r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { hook, watch } from "../../core/decorators/index.js";
import { Dom } from "../../core/dom/dom.js";
import { LazyWalker } from "../../core/dom/lazy-walker.js";
import { pluginSystem } from "../../core/global.js";
import { safeHTML } from "../../core/helpers/html/safe-html.js";
import { Plugin } from "../../core/plugin/plugin.js";
import "./config.js";
import { getHash, removeFormatForCollapsedSelection, removeFormatForSelection, visitNodeWalker } from "./helpers/index.js";
/**
 * Clean HTML after removeFormat and insertHorizontalRule command
 */
export class cleanHtml extends Plugin {
    constructor() {
        super(...arguments);
        /** @override */
        this.buttons = [
            {
                name: 'eraser',
                group: 'font-style'
            }
        ];
        this.currentSelectionNode = null;
        this.walker = new LazyWalker(this.j.async, {
            timeout: this.j.o.cleanHTML.timeout
        });
    }
    /** @override */
    afterInit(jodit) { }
    get isEditMode() {
        return !(this.j.isInDestruct ||
            !this.j.isEditorMode() ||
            this.j.getReadOnly());
    }
    /**
     * Clean HTML code on every change
     */
    onChangeCleanHTML() {
        if (!this.isEditMode) {
            return;
        }
        const editor = this.j;
        this.walker.setWork(editor.editor);
        this.currentSelectionNode = editor.s.current();
    }
    startWalker() {
        const { jodit } = this;
        const allow = getHash(this.j.o.cleanHTML.allowTags);
        const deny = getHash(this.j.o.cleanHTML.denyTags);
        this.walker
            .on('visit', (node) => visitNodeWalker(jodit, node, allow, deny, this.currentSelectionNode))
            .on('end', (affected) => {
            this.j.e.fire(affected
                ? 'internalChange finishedCleanHTMLWorker'
                : 'finishedCleanHTMLWorker');
        });
    }
    beforeCommand(command) {
        if (command.toLowerCase() === 'removeformat') {
            if (this.j.s.isCollapsed()) {
                removeFormatForCollapsedSelection(this.j);
            }
            else {
                removeFormatForSelection(this.j);
            }
            return false;
        }
    }
    /**
     * Event handler when manually assigning a value to the HTML editor.
     */
    onBeforeSetNativeEditorValue(data) {
        const [sandBox, iframe] = this.j.o.cleanHTML.useIframeSandbox
            ? this.j.createInside.sandbox()
            : [this.j.createInside.div()];
        sandBox.innerHTML = data.value;
        this.onSafeHTML(sandBox);
        data.value = sandBox.innerHTML;
        safeHTML(sandBox, { safeJavaScriptLink: true, removeOnError: true });
        Dom.safeRemove(iframe);
        return false;
    }
    onSafeHTML(sandBox) {
        safeHTML(sandBox, this.j.o.cleanHTML);
    }
    /** @override */
    beforeDestruct() {
        this.walker.destruct();
    }
}
__decorate([
    watch([':change', ':afterSetMode', ':afterInit', ':mousedown', ':keydown'])
], cleanHtml.prototype, "onChangeCleanHTML", null);
__decorate([
    hook('ready')
], cleanHtml.prototype, "startWalker", null);
__decorate([
    watch(':beforeCommand')
], cleanHtml.prototype, "beforeCommand", null);
__decorate([
    watch(':beforeSetNativeEditorValue')
], cleanHtml.prototype, "onBeforeSetNativeEditorValue", null);
__decorate([
    watch(':safeHTML')
], cleanHtml.prototype, "onSafeHTML", null);
pluginSystem.add('cleanHtml', cleanHtml);
