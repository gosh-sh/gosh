/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { pluginSystem } from "../../core/global.js";
import { isArray } from "../../core/helpers/index.js";
import { Icon } from "../../core/ui/icon.js";
import "./interface.js";
import "./config.js";
import boldIcon from "./icons/bold.svg.js";
import italicIcon from "./icons/italic.svg.js";
import strikethroughIcon from "./icons/strikethrough.svg.js";
import subscriptIcon from "./icons/subscript.svg.js";
import superscriptIcon from "./icons/superscript.svg.js";
import underlineIcon from "./icons/underline.svg.js";
import { Config } from "../../config.js";
/**
 * Adds `bold`,` strikethrough`, `underline` and` italic` buttons to Jodit
 */
export function bold(editor) {
    const callBack = (command) => {
        const control = Config.defaultOptions.controls[command], cssOptions = {
            ...control.css
        };
        let cssRules;
        Object.keys(cssOptions).forEach((key) => {
            if (!cssRules) {
                cssRules = {};
            }
            cssRules[key] = isArray(cssOptions[key])
                ? cssOptions[key][0]
                : cssOptions[key];
        });
        editor.s.commitStyle({
            element: control.tags ? control.tags[0] : undefined
        });
        editor.synchronizeValues();
        return false;
    };
    ['bold', 'italic', 'underline', 'strikethrough'].forEach(name => {
        editor.registerButton({
            name,
            group: 'font-style'
        });
    });
    ['superscript', 'subscript'].forEach(name => {
        editor.registerButton({
            name,
            group: 'script'
        });
    });
    editor
        .registerCommand('bold', {
        exec: callBack,
        hotkeys: ['ctrl+b', 'cmd+b']
    })
        .registerCommand('italic', {
        exec: callBack,
        hotkeys: ['ctrl+i', 'cmd+i']
    })
        .registerCommand('underline', {
        exec: callBack,
        hotkeys: ['ctrl+u', 'cmd+u']
    })
        .registerCommand('strikethrough', {
        exec: callBack
    })
        .registerCommand('subscript', {
        exec: callBack
    })
        .registerCommand('superscript', {
        exec: callBack
    });
}
pluginSystem.add('bold', bold);
Icon.set('bold', boldIcon)
    .set('italic', italicIcon)
    .set('strikethrough', strikethroughIcon)
    .set('subscript', subscriptIcon)
    .set('superscript', superscriptIcon)
    .set('underline', underlineIcon);
