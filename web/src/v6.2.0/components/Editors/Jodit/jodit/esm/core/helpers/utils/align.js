/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../dom/index.js";
import { clearCenterAlign, css } from "./css.js";
/**
 * Align image
 */
export function hAlignElement(image, align) {
    if (align && align !== 'normal') {
        if (align !== 'center') {
            css(image, 'float', align);
            clearCenterAlign(image);
        }
        else {
            css(image, {
                float: '',
                display: 'block',
                marginLeft: 'auto',
                marginRight: 'auto'
            });
        }
    }
    else {
        if (css(image, 'float') &&
            ['right', 'left'].indexOf(css(image, 'float').toString().toLowerCase()) !== -1) {
            css(image, 'float', '');
        }
        clearCenterAlign(image);
    }
}
/**
 * Remove text-align style for all selected children
 */
export function clearAlign(node) {
    Dom.each(node, elm => {
        if (Dom.isHTMLElement(elm)) {
            if (elm.style.textAlign) {
                elm.style.textAlign = '';
                if (!elm.style.cssText.trim().length) {
                    elm.removeAttribute('style');
                }
            }
        }
    });
}
/**
 * Apply align for element
 */
export function alignElement(command, box) {
    if (Dom.isNode(box) && Dom.isElement(box)) {
        clearAlign(box);
        switch (command.toLowerCase()) {
            case 'justifyfull':
                box.style.textAlign = 'justify';
                break;
            case 'justifyright':
                box.style.textAlign = 'right';
                break;
            case 'justifyleft':
                box.style.textAlign = 'left';
                break;
            case 'justifycenter':
                box.style.textAlign = 'center';
                break;
        }
    }
}
