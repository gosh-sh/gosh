/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { isFunction, isJoditObject } from "../../core/helpers/index.js";
import { ToolbarButton } from "./button/button.js";
import { ToolbarContent } from "./button/content.js";
import { ToolbarSelect } from "./button/select/select.js";
import { ToolbarCollection } from "./collection/collection.js";
import { ToolbarEditorCollection } from "./collection/editor-collection.js";
/**
 * Collection factory
 */
export function makeCollection(jodit, parentElement) {
    const collection = isJoditObject(jodit)
        ? new ToolbarEditorCollection(jodit)
        : new ToolbarCollection(jodit);
    if (jodit.o.textIcons) {
        collection.container.classList.add('jodit_text_icons');
    }
    if (parentElement) {
        collection.parentElement = parentElement;
    }
    if (jodit.o.toolbarButtonSize) {
        collection.buttonSize = jodit.o.toolbarButtonSize;
    }
    return collection;
}
/**
 * Button factory
 */
export function makeButton(jodit, control, target = null) {
    if (isFunction(control.getContent)) {
        return new ToolbarContent(jodit, control, target);
    }
    const button = new ToolbarButton(jodit, control, target);
    button.state.tabIndex = jodit.o.allowTabNavigation ? 0 : -1;
    return button;
}
export function makeSelect(view, control, target = null) {
    return new ToolbarSelect(view, control, target);
}
