/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Component } from "../../../core/component/index.js";
import { Dom } from "../../../core/dom/dom.js";
import { $$ } from "../../../core/helpers/index.js";
import { isFunction } from "../../../core/helpers/checker/is-function.js";
import { Button, UIElement } from "../../../core/ui/index.js";
/**
 * Build tabs system
 *
 * @param tabs - PlainObject where 'key' will be tab's Title and `value` is tab's content
 * @param state - You can use for this param any HTML element for remembering active tab
 *
 * @example
 * ```javascript
 * const editor = Jodit.make('#editor');
 * const tabs = Jodit.modules.TabsWidget(editor, [
 *  { name: 'Images', content: '<div>Images</div>' },
 *  {
 *    name: 'Title 2',
 *    content: editor.c.fromHTML('<div>Some content</div>')
 *  },
 *  {
 *    name: 'Color Picker',
 *    content: ColorPickerWidget(
 *      editor,
 *      function (color) {
 *        box.style.color = color;
 *      },
 *      box.style.color
 *    )
 *  }
 * ]);
 * ```
 */
export const TabsWidget = (jodit, tabs, state) => {
    const box = jodit.c.div('jodit-tabs'), tabBox = jodit.c.div('jodit-tabs__wrapper'), buttons = jodit.c.div('jodit-tabs__buttons'), nameToTab = {}, buttonList = [];
    let firstTab = '', tabCount = 0;
    box.appendChild(buttons);
    box.appendChild(tabBox);
    const setActive = (tab) => {
        if (!nameToTab[tab]) {
            return;
        }
        buttonList.forEach(b => {
            b.state.variant = 'initial';
            b.state.activated = false;
        });
        $$('.jodit-tab', tabBox).forEach(a => {
            a.classList.remove('jodit-tab_active');
        });
        nameToTab[tab].button.state.variant = 'outline';
        nameToTab[tab].button.state.activated = true;
        nameToTab[tab].tab.classList.add('jodit-tab_active');
    };
    tabs.forEach(({ icon, name, content }) => {
        const tab = jodit.c.div('jodit-tab'), button = Button(jodit, icon || name, name);
        // Stop lose the focus
        jodit.e.on(button.container, 'mousedown', (e) => e.preventDefault());
        if (!firstTab) {
            firstTab = name;
        }
        buttons.appendChild(button.container);
        buttonList.push(button);
        button.container.classList.add('jodit-tabs__button', 'jodit-tabs__button_columns_' + tabs.length);
        if (!isFunction(content)) {
            tab.appendChild(Component.isInstanceOf(content, UIElement)
                ? content.container
                : content);
        }
        else {
            tab.appendChild(jodit.c.div('jodit-tab_empty'));
        }
        tabBox.appendChild(tab);
        button.onAction(() => {
            setActive(name);
            if (isFunction(content) && !Dom.isElement(content)) {
                content.call(jodit);
            }
            if (state) {
                state.activeTab = name;
            }
            return false;
        });
        nameToTab[name] = {
            button,
            tab
        };
        tabCount += 1;
    });
    if (!tabCount) {
        return box;
    }
    $$('a', buttons).forEach(a => {
        a.style.width = (100 / tabCount).toFixed(10) + '%';
    });
    const tab = !state || !state.activeTab || !nameToTab[state.activeTab]
        ? firstTab
        : state.activeTab;
    setActive(tab);
    if (state) {
        let activeTab = state.activeTab;
        Object.defineProperty(state, 'activeTab', {
            configurable: true,
            enumerable: false,
            get() {
                return activeTab;
            },
            set(value) {
                activeTab = value;
                setActive(value);
            }
        });
    }
    return box;
};
