/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../../core/dom/index.js";
import { attr, ctrlKey } from "../../../core/helpers/index.js";
import contextMenu from "../builders/context-menu.js";
import { elementsMap } from "../builders/elements-map.js";
import { loadTree } from "../fetch/load-tree.js";
/**
 * @private
 */
export const getItem = (node, root, tag = 'a') => Dom.closest(node, elm => Dom.isTag(elm, tag), root);
/**
 * @private
 */
export const elementToItem = (elm, elementsMap) => {
    const { key } = elm.dataset, { item } = elementsMap[key || ''];
    return item;
};
/**
 * @private
 */
export function nativeListeners() {
    let dragElement = false;
    const elmMap = elementsMap(this);
    const self = this;
    self.e
        .on(self.tree.container, 'dragstart', (e) => {
        const a = getItem(e.target, self.container);
        if (!a) {
            return;
        }
        if (self.o.moveFolder) {
            dragElement = a;
        }
    })
        .on(self.tree.container, 'drop', (e) => {
        if ((self.o.moveFile || self.o.moveFolder) && dragElement) {
            let path = attr(dragElement, '-path') || '';
            // move folder
            if (!self.o.moveFolder &&
                dragElement.classList.contains(this.tree.getFullElName('item'))) {
                return false;
            }
            // move file
            if (dragElement.classList.contains(this.files.getFullElName('item'))) {
                path += attr(dragElement, '-name');
                if (!self.o.moveFile) {
                    return false;
                }
            }
            const a = getItem(e.target, self.container);
            if (!a) {
                return;
            }
            self.dataProvider
                .move(path, attr(a, '-path') || '', attr(a, '-source') || '', dragElement.classList.contains(this.files.getFullElName('item')))
                .then(() => loadTree(this))
                .catch(self.status);
            dragElement = false;
        }
    })
        .on(self.files.container, 'contextmenu', contextMenu(self))
        .on(self.files.container, 'click', (e) => {
        if (!ctrlKey(e)) {
            this.state.activeElements = [];
        }
    })
        .on(self.files.container, 'click', (e) => {
        const a = getItem(e.target, self.container);
        if (!a) {
            return;
        }
        const item = elementToItem(a, elmMap);
        if (!item) {
            return;
        }
        if (!ctrlKey(e)) {
            self.state.activeElements = [item];
        }
        else {
            self.state.activeElements = [
                ...self.state.activeElements,
                item
            ];
        }
        e.stopPropagation();
        return false;
    })
        .on(self.files.container, 'dragstart', (e) => {
        if (self.o.moveFile) {
            const a = getItem(e.target, self.container);
            if (!a) {
                return;
            }
            dragElement = a;
        }
    })
        .on(self.container, 'drop', (e) => e.preventDefault());
}
