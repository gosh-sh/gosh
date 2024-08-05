/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { pluginSystem } from "../../core/global.js";
import { isJoditObject } from "../../core/helpers/checker/is-jodit-object.js";
import { css } from "../../core/helpers/utils/css.js";
import "./config.js";
const fullsizeStack = new Set();
/**
 * Process `toggleFullSize` event, and behavior - set/unset fullsize mode
 */
export function fullsize(editor) {
    editor.registerButton({
        name: 'fullsize'
    });
    let isEnabled = false, oldHeight = 0, oldWidth = 0, wasToggled = false;
    const resize = () => {
        const { container, events } = editor;
        if (!events) {
            return;
        }
        if (isEnabled) {
            oldHeight = css(container, 'height', true);
            oldWidth = css(container, 'width', true);
            css(container, {
                height: editor.ow.innerHeight,
                width: editor.ow.innerWidth
            });
            wasToggled = true;
        }
        else if (wasToggled) {
            css(container, {
                height: oldHeight || 'auto',
                width: oldWidth || 'auto'
            });
        }
    }, 
    /**
     * Change editor's state between FullSize and normal
     */
    toggle = (enable) => {
        const { container, events } = editor;
        if (!container) {
            return;
        }
        if (enable === undefined) {
            enable = !container.classList.contains('jodit_fullsize');
        }
        editor.setMod('fullsize', enable);
        editor.o.fullsize = enable;
        isEnabled = enable;
        container.classList.toggle('jodit_fullsize', enable);
        if (editor.toolbar) {
            isJoditObject(editor) &&
                editor.toolbarContainer?.appendChild(editor.toolbar.container);
            css(editor.toolbar.container, 'width', 'auto');
        }
        enable
            ? fullsizeStack.add(container)
            : fullsizeStack.delete(container);
        const shouldToggleGlobalFullsize = editor.o.globalFullSize &&
            ((fullsizeStack.size === 1 && enable) ||
                (fullsizeStack.size === 0 && !enable));
        if (shouldToggleGlobalFullsize) {
            let node = container.parentNode;
            while (node &&
                node.nodeType !== Node.DOCUMENT_NODE &&
                node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
                node.classList.toggle('jodit_fullsize-box_true', enable);
                node = node.parentNode;
            }
            resize();
        }
        events.fire('afterResize');
    };
    if (editor.o.globalFullSize) {
        editor.e.on(editor.ow, 'resize', resize);
    }
    editor.e
        .on('afterInit afterOpen', () => {
        editor.toggleFullSize(editor?.options?.fullsize);
    })
        .on('toggleFullSize', toggle)
        .on('beforeDestruct', () => {
        isEnabled && toggle(false);
    })
        .on('beforeDestruct', () => {
        editor.events && editor.e.off(editor.ow, 'resize', resize);
    });
}
pluginSystem.add('fullsize', fullsize);
