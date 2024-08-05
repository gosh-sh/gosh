/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { INVISIBLE_SPACE, MODE_WYSIWYG } from "../../core/constants.js";
import { Dom } from "../../core/dom/index.js";
import { pluginSystem } from "../../core/global.js";
import { attr, getXPathByElement, trim } from "../../core/helpers/index.js";
import { Plugin } from "../../core/plugin/index.js";
import { ContextMenu } from "../../modules/context-menu/context-menu.js";
import { makeButton } from "../../modules/toolbar/factory.js";
import "./config.js";
/**
 * Show a path to a current element in status bar
 */
class xpath extends Plugin {
    constructor() {
        super(...arguments);
        this.onContext = (bindElement, event) => {
            if (!this.menu) {
                this.menu = new ContextMenu(this.j);
            }
            this.menu.show(event.clientX, event.clientY, [
                {
                    icon: 'bin',
                    title: bindElement === this.j.editor ? 'Clear' : 'Remove',
                    exec: () => {
                        if (bindElement !== this.j.editor) {
                            Dom.safeRemove(bindElement);
                        }
                        else {
                            this.j.value = '';
                        }
                        this.j.synchronizeValues();
                    }
                },
                {
                    icon: 'select-all',
                    title: 'Select',
                    exec: () => {
                        this.j.s.select(bindElement);
                    }
                }
            ]);
            return false;
        };
        this.onSelectPath = (bindElement, event) => {
            this.j.s.focus();
            const path = attr(event.target, '-path') || '/';
            if (path === '/') {
                this.j.execCommand('selectall');
                return false;
            }
            try {
                const elm = this.j.ed
                    .evaluate(path, this.j.editor, null, XPathResult.ANY_TYPE, null)
                    .iterateNext();
                if (elm) {
                    this.j.s.select(elm);
                    return false;
                }
            }
            catch { }
            this.j.s.select(bindElement);
            return false;
        };
        this.tpl = (bindElement, path, name, title) => {
            const item = this.j.c.fromHTML(`<span class="jodit-xpath__item"><a role="button" data-path="${path}" title="${title}" tabindex="-1"'>${trim(name)}</a></span>`);
            const a = item.firstChild;
            this.j.e
                .on(a, 'click', this.onSelectPath.bind(this, bindElement))
                .on(a, 'contextmenu', this.onContext.bind(this, bindElement));
            return item;
        };
        this.removeSelectAll = () => {
            if (this.selectAllButton) {
                this.selectAllButton.destruct();
                delete this.selectAllButton;
            }
        };
        this.appendSelectAll = () => {
            this.removeSelectAll();
            this.selectAllButton = makeButton(this.j, {
                name: 'selectall',
                ...this.j.o.controls.selectall
            });
            this.selectAllButton.state.size = 'tiny';
            this.container &&
                this.container.insertBefore(this.selectAllButton.container, this.container.firstChild);
        };
        this.calcPathImd = () => {
            if (this.isDestructed) {
                return;
            }
            const current = this.j.s.current();
            if (this.container) {
                this.container.innerHTML = INVISIBLE_SPACE;
            }
            if (current) {
                let name, xpth, li;
                Dom.up(current, (elm) => {
                    if (elm &&
                        this.j.editor !== elm &&
                        !Dom.isText(elm) &&
                        !Dom.isComment(elm)) {
                        name = elm.nodeName.toLowerCase();
                        xpth = getXPathByElement(elm, this.j.editor).replace(/^\//, '');
                        li = this.tpl(elm, xpth, name, this.j.i18n('Select %s', name));
                        this.container &&
                            this.container.insertBefore(li, this.container.firstChild);
                    }
                }, this.j.editor);
            }
            this.appendSelectAll();
        };
        this.calcPath = this.j.async.debounce(this.calcPathImd, this.j.defaultTimeout * 2);
    }
    afterInit() {
        if (this.j.o.showXPathInStatusbar) {
            this.container = this.j.c.div('jodit-xpath');
            this.j.e
                .off('.xpath')
                .on('mouseup.xpath change.xpath keydown.xpath changeSelection.xpath', this.calcPath)
                .on('afterSetMode.xpath afterInit.xpath changePlace.xpath', () => {
                if (!this.j.o.showXPathInStatusbar || !this.container) {
                    return;
                }
                this.j.statusbar.append(this.container);
                if (this.j.getRealMode() === MODE_WYSIWYG) {
                    this.calcPath();
                }
                else {
                    if (this.container) {
                        this.container.innerHTML = INVISIBLE_SPACE;
                    }
                    this.appendSelectAll();
                }
            });
            this.calcPath();
        }
    }
    beforeDestruct() {
        if (this.j && this.j.events) {
            this.j.e.off('.xpath');
        }
        this.removeSelectAll();
        this.menu && this.menu.destruct();
        Dom.safeRemove(this.container);
        delete this.menu;
        delete this.container;
    }
}
pluginSystem.add('xpath', xpath);
