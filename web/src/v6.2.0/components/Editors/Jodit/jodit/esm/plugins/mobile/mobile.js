/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { pluginSystem } from "../../core/global.js";
import { splitArray, toArray } from "../../core/helpers/index.js";
import { flatButtonsSet } from "../../core/ui/helpers/buttons.js";
import "./config.js";
/**
 * Rebuild toolbar in depends on editor's width
 */
export function mobile(editor) {
    let timeout = 0, store = splitArray(editor.o.buttons);
    if (editor.o.mobileTapTimeout) {
        // Emulate double tap
        editor.e.on('touchend', (e) => {
            if (e.changedTouches && e.changedTouches.length) {
                const now = new Date().getTime(), diff = now - timeout;
                if (diff > editor.o.mobileTapTimeout) {
                    timeout = now;
                    if (diff < editor.o.mobileTapTimeout * 1.5) {
                        editor.s.insertCursorAtPoint(e.clientX, e.clientY);
                    }
                }
            }
        });
    }
    editor.e.on('getDiffButtons.mobile', (toolbar) => {
        if (toolbar === editor.toolbar) {
            const buttons = flatButtonsSet(splitArray(editor.o.buttons), editor), flatStore = flatButtonsSet(store, editor);
            return toArray(buttons).reduce((acc, item) => {
                if (!flatStore.has(item)) {
                    acc.push(item);
                }
                return acc;
            }, []);
        }
    });
    if (editor.o.toolbarAdaptive) {
        editor.e
            .on('resize afterInit recalcAdaptive changePlace afterAddPlace', () => {
            if (!editor.o.toolbar) {
                return;
            }
            const width = (editor.container.parentElement ?? editor.container).offsetWidth;
            const newStore = (() => {
                if (editor.isFullSize || width >= editor.o.sizeLG) {
                    return splitArray(editor.o.buttons);
                }
                if (width >= editor.o.sizeMD) {
                    return splitArray(editor.o.buttonsMD);
                }
                if (width >= editor.o.sizeSM) {
                    return splitArray(editor.o.buttonsSM);
                }
                return splitArray(editor.o.buttonsXS);
            })();
            if (newStore.toString() !== store.toString()) {
                store = newStore;
                editor.e.fire('closeAllPopups');
                editor.toolbar
                    ?.setRemoveButtons(editor.o.removeButtons)
                    .build(store.concat(editor.o.extraButtons));
            }
        })
            .on(editor.ow, 'load resize', () => editor.e.fire('recalcAdaptive'));
    }
}
pluginSystem.add('mobile', mobile);
