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
import { autobind } from "../../core/decorators/index.js";
import { Dom } from "../../core/dom/index.js";
import { pluginSystem } from "../../core/global.js";
import { isString } from "../../core/helpers/checker/is-string.js";
import { Plugin } from "../../core/plugin/index.js";
import "./config.js";
/**
 * Wrap single text nodes in block wrapper
 */
class wrapNodes extends Plugin {
    constructor() {
        super(...arguments);
        /**
         * Found Node which should be wrapped
         */
        this.isSuitableStart = (n) => (Dom.isText(n) &&
            isString(n.nodeValue) &&
            (/[^\s]/.test(n.nodeValue) ||
                (n.parentNode?.firstChild === n &&
                    this.isSuitable(n.nextSibling)))) ||
            (this.isNotWrapped(n) && !Dom.isTemporary(n));
        /**
         * Node should add in a block element
         */
        this.isSuitable = (n) => Dom.isText(n) || this.isNotWrapped(n);
        /**
         * Some element which needs to append in block
         */
        this.isNotWrapped = (n) => Dom.isElement(n) &&
            !(Dom.isBlock(n) || Dom.isTag(n, this.j.o.wrapNodes.exclude));
    }
    /** @override **/
    afterInit(jodit) {
        if (jodit.o.enter.toLowerCase() === 'br') {
            return;
        }
        jodit.e
            .on('drop.wtn focus.wtn keydown.wtn mousedown.wtn afterInit.wtn backSpaceAfterDelete.wtn', this.preprocessInput, {
            top: true
        })
            .on('afterInit.wtn postProcessSetEditorValue.wtn afterCommitStyle.wtn backSpaceAfterDelete.wtn', this.postProcessSetEditorValue);
    }
    /** @override **/
    beforeDestruct(jodit) {
        jodit.e.off('.wtn');
    }
    /**
     * Process changed value
     */
    postProcessSetEditorValue() {
        const { jodit } = this;
        if (!jodit.isEditorMode()) {
            return;
        }
        let child = jodit.editor.firstChild, isChanged = false;
        while (child) {
            child = checkAloneListLeaf(child, jodit);
            if (this.isSuitableStart(child)) {
                if (!isChanged) {
                    jodit.s.save();
                }
                isChanged = true;
                const box = jodit.createInside.element(jodit.o.enter);
                Dom.before(child, box);
                while (child && this.isSuitable(child)) {
                    const next = child.nextSibling;
                    box.appendChild(child);
                    child = next;
                }
                box.normalize();
                child = box;
            }
            child = child && child.nextSibling;
        }
        if (isChanged) {
            jodit.s.restore();
            if (jodit.e.current === 'afterInit') {
                jodit.e.fire('internalChange');
            }
        }
    }
    /**
     * Process input without parent box
     */
    preprocessInput() {
        const { jodit } = this, isAfterInitEvent = jodit.e.current === 'afterInit';
        if (!jodit.isEditorMode() ||
            jodit.editor.firstChild ||
            (!jodit.o.wrapNodes.emptyBlockAfterInit && isAfterInitEvent)) {
            return;
        }
        const box = jodit.createInside.element(jodit.o.enter);
        const br = jodit.createInside.element('br');
        Dom.append(box, br);
        Dom.append(jodit.editor, box);
        jodit.s.isFocused() && jodit.s.setCursorBefore(br);
        jodit.e.fire('internalChange');
    }
}
__decorate([
    autobind
], wrapNodes.prototype, "postProcessSetEditorValue", null);
__decorate([
    autobind
], wrapNodes.prototype, "preprocessInput", null);
function checkAloneListLeaf(child, jodit) {
    let result = child;
    let next = child;
    do {
        if (Dom.isElement(next) &&
            Dom.isLeaf(next) &&
            !Dom.isList(next.parentElement)) {
            const nextChild = Dom.findNotEmptySibling(next, false);
            if (Dom.isTag(result, 'ul')) {
                result.appendChild(next);
            }
            else {
                result = Dom.wrap(next, 'ul', jodit.createInside);
            }
            next = nextChild;
        }
        else {
            break;
        }
    } while (next);
    return result;
}
pluginSystem.add('wrapNodes', wrapNodes);
