/*!
 * Jodit Editor (https://xdsoft.net/../jodit_/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { pluginSystem } from "../../jodit/esm/core/global.js";
import { Icon } from "../../jodit/esm/core/ui/icon.js";
import changeCaseIcon from "./change-case.svg.js";
import { Config } from "../../jodit/esm/config.js";
Icon.set('changeCase', changeCaseIcon);
Config.prototype.controls.changeCase = {
    name: 'changeCase',
    text: 'Change Case',
    tooltip: 'Change Case',
    isDisabled: (editor) => editor.s.isCollapsed(),
    defaultValue: [],
    list: ['lowercase', 'uppercase', 'titlecase']
};
Config.prototype.controls.lowercase = {
    command: 'lowercase',
    text: 'lowercase',
    tooltip: 'Lowercase'
};
Config.prototype.controls.uppercase = {
    command: 'uppercase',
    text: 'UPPERCASE',
    tooltip: 'Uppercase'
};
Config.prototype.controls.capitalizedcase = {
    command: 'titlecase',
    text: 'Title Case',
    tooltip: 'Title Case'
};

const changeHtmlCase = (htmlString, caseType) => {
    // Create a temporary DOM element to hold the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;

    // Function to change the text nodes
    function transformTextNodes(node) {
        if (node.nodeType === 3) { // Node type 3 is a text node
            switch (caseType) {
                case 'uppercase':
                    node.nodeValue = node.nodeValue.toUpperCase();
                    break;
                case 'lowercase':
                    node.nodeValue = node.nodeValue.toLowerCase();
                    break;
                case 'titlecase':
                    node.nodeValue = node.nodeValue.replace(/\w\S*/g, (txt) => {
                        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                    });
                    break;
            }
        } else {
            node.childNodes.forEach(transformTextNodes);
        }
    }

    // Start transforming text nodes
    transformTextNodes(tempDiv);

    // Return the modified HTML
    return tempDiv.innerHTML;
}

/**
 * Process commands: `uppercase`, `lowercase`, `capitalizedcase`
 */
export function changeCase(editor) {
    editor.registerButton({
        name: 'changeCase',
        group: 'format'
    });
    const callback = (command) => {
        const range = editor.s.createRange();
        editor.s.insertHTML(changeHtmlCase(editor.s.html, command));
        editor.s.remove();
        editor.s.selectRange(range);
        return true;
    };
    editor.registerCommand('uppercase', callback);
    editor.registerCommand('lowercase', callback);
    editor.registerCommand('titlecase', callback);
}
pluginSystem.add('changeCase', changeCase);
