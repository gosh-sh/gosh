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
import { STATUSES } from "../component/statuses.js";
import { autobind } from "../decorators/autobind/autobind.js";
import { watch } from "../decorators/watch/watch.js";
import { Dom } from "../dom/dom.js";
import { splitArray } from "../helpers/array/index.js";
import { isString } from "../helpers/checker/is-string.js";
import { resolveElement } from "../helpers/utils/selector.js";
import { isButtonGroup } from "../ui/helpers/buttons.js";
import { View } from "./view.js";
import { makeCollection } from "../../modules/toolbar/factory.js";
export class ViewWithToolbar extends View {
    /**
     * Container for toolbar
     */
    get toolbarContainer() {
        if (!this.o.fullsize &&
            (isString(this.o.toolbar) || Dom.isHTMLElement(this.o.toolbar))) {
            return resolveElement(this.o.toolbar, this.o.shadowRoot || this.od);
        }
        this.o.toolbar &&
            Dom.appendChildFirst(this.container, this.__defaultToolbarContainer);
        return this.__defaultToolbarContainer;
    }
    /**
     * Change panel container
     */
    setPanel(element) {
        this.o.toolbar = element;
        this.buildToolbar();
    }
    /**
     * Helper for appended toolbar in its place
     */
    buildToolbar() {
        if (!this.o.toolbar) {
            return;
        }
        const buttons = this.o.buttons
            ? splitArray(this.o.buttons)
            : [];
        this.toolbar
            ?.setRemoveButtons(this.o.removeButtons)
            .build(buttons.concat(this.o.extraButtons || []))
            .appendTo(this.toolbarContainer);
    }
    getRegisteredButtonGroups() {
        return this.groupToButtons;
    }
    /**
     * Register button for a group
     */
    registerButton(btn) {
        this.registeredButtons.add(btn);
        const group = btn.group ?? 'other';
        if (!this.groupToButtons[group]) {
            this.groupToButtons[group] = [];
        }
        if (btn.position != null) {
            this.groupToButtons[group][btn.position] = btn.name;
        }
        else {
            this.groupToButtons[group].push(btn.name);
        }
        return this;
    }
    /**
     * Remove button from a group
     */
    unregisterButton(btn) {
        this.registeredButtons.delete(btn);
        const groupName = btn.group ?? 'other', group = this.groupToButtons[groupName];
        if (group) {
            const index = group.indexOf(btn.name);
            if (index !== -1) {
                group.splice(index, 1);
            }
            if (group.length === 0) {
                delete this.groupToButtons[groupName];
            }
        }
        return this;
    }
    /**
     * Prepare toolbar items and append buttons in groups
     */
    beforeToolbarBuild(items) {
        if (Object.keys(this.groupToButtons).length) {
            return items.map(item => {
                if (isButtonGroup(item) &&
                    item.group &&
                    this.groupToButtons[item.group]) {
                    return {
                        group: item.group,
                        buttons: [
                            ...item.buttons,
                            ...this.groupToButtons[item.group]
                        ]
                    };
                }
                return item;
            });
        }
    }
    /** @override **/
    constructor(options, isJodit = false) {
        super(options, isJodit);
        this.toolbar = makeCollection(this);
        this.__defaultToolbarContainer = this.c.div('jodit-toolbar__box');
        this.registeredButtons = new Set();
        this.groupToButtons = {};
        this.isJodit = false;
        this.isJodit = isJodit;
        this.e.on('beforeToolbarBuild', this.beforeToolbarBuild);
    }
    destruct() {
        if (this.isDestructed) {
            return;
        }
        this.setStatus(STATUSES.beforeDestruct);
        this.e.off('beforeToolbarBuild', this.beforeToolbarBuild);
        this.toolbar.destruct();
        // @ts-ignore After destruct, we are not responsible for anything
        this.toolbar = undefined;
        super.destruct();
    }
}
__decorate([
    watch(':rebuildToolbar')
], ViewWithToolbar.prototype, "buildToolbar", null);
__decorate([
    autobind
], ViewWithToolbar.prototype, "beforeToolbarBuild", null);
