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
import { IS_PROD } from "../../core/constants.js";
import { autobind, cache, watch } from "../../core/decorators/index.js";
import { Dom, LazyWalker } from "../../core/dom/index.js";
import { pluginSystem } from "../../core/global.js";
import { scrollIntoViewIfNeeded } from "../../core/helpers/index.js";
import { Plugin } from "../../core/plugin/index.js";
import "./config.js";
import { clearSelectionWrappers, clearSelectionWrappersFromHTML, getSelectionWrappers, highlightTextRanges, SentenceFinder } from "./helpers/index.js";
import { UISearch } from "./ui/search.js";
/**
 * Search plugin. it is used for custom search in text
 * ![search](https://user-images.githubusercontent.com/794318/34545433-cd0a9220-f10e-11e7-8d26-7e22f66e266d.gif)
 *
 * @example
 * ```typescript
 * var jodit = Jodit.make('#editor', {
 *  useSearch: false
 * });
 * // or
 * var jodit = Jodit.make('#editor', {
 *  disablePlugins: 'search'
 * });
 * ```
 */
export class search extends Plugin {
    constructor() {
        super(...arguments);
        this.buttons = [
            {
                name: 'find',
                group: 'search'
            }
        ];
        this.previousQuery = '';
        this.drawPromise = null;
        this.walker = null;
        this.walkerCount = null;
        this.cache = {};
        this.wrapFrameRequest = 0;
    }
    get ui() {
        return new UISearch(this.j);
    }
    async updateCounters() {
        if (!this.ui.isOpened) {
            return;
        }
        this.ui.count = await this.calcCounts(this.ui.query);
    }
    onPressReplaceButton() {
        this.findAndReplace(this.ui.query);
        this.updateCounters();
    }
    tryScrollToElement(startContainer) {
        // find scrollable element
        let parentBox = Dom.closest(startContainer, Dom.isElement, this.j.editor);
        if (!parentBox) {
            parentBox = Dom.prev(startContainer, Dom.isElement, this.j.editor);
        }
        parentBox &&
            parentBox !== this.j.editor &&
            scrollIntoViewIfNeeded(parentBox, this.j.editor, this.j.ed);
    }
    async calcCounts(query) {
        return (await this.findQueryBounds(query, 'walkerCount')).length;
    }
    async findQueryBounds(query, walkerKey) {
        let walker = this[walkerKey];
        if (walker) {
            walker.break();
        }
        walker = new LazyWalker(this.j.async, {
            timeout: this.j.o.search.lazyIdleTimeout
        });
        this[walkerKey] = walker;
        return this.find(walker, query).catch(e => {
            !IS_PROD && console.error(e);
            return [];
        });
    }
    async findAndReplace(query) {
        const bounds = await this.findQueryBounds(query, 'walker');
        if (!bounds.length) {
            return false;
        }
        let currentIndex = this.findCurrentIndexInRanges(bounds, this.j.s.range);
        if (currentIndex === -1) {
            currentIndex = 0;
        }
        const bound = bounds[currentIndex];
        if (bound) {
            try {
                const rng = this.j.ed.createRange();
                rng.setStart(bound.startContainer, bound.startOffset);
                rng.setEnd(bound.endContainer, bound.endOffset);
                rng.deleteContents();
                const textNode = this.j.createInside.text(this.ui.replace);
                Dom.safeInsertNode(rng, textNode);
                clearSelectionWrappers(this.j.editor);
                this.j.s.setCursorAfter(textNode);
                this.tryScrollToElement(textNode);
                this.cache = {};
                this.ui.currentIndex = currentIndex;
                await this.findAndSelect(query, true).catch(e => {
                    !IS_PROD && console.error(e);
                    return null;
                });
            }
            finally {
                this.j.synchronizeValues();
            }
            this.j.e.fire('afterFindAndReplace');
            return true;
        }
        return false;
    }
    async findAndSelect(query, next) {
        const bounds = await this.findQueryBounds(query, 'walker');
        if (!bounds.length) {
            return false;
        }
        if (this.previousQuery !== query ||
            !getSelectionWrappers(this.j.editor).length) {
            this.drawPromise?.rejectCallback();
            this.j.async.cancelAnimationFrame(this.wrapFrameRequest);
            clearSelectionWrappers(this.j.editor);
            this.drawPromise = this.__drawSelectionRanges(bounds);
        }
        this.previousQuery = query;
        let currentIndex = this.ui.currentIndex - 1;
        if (currentIndex === -1) {
            currentIndex = 0;
        }
        else if (next) {
            currentIndex =
                currentIndex === bounds.length - 1 ? 0 : currentIndex + 1;
        }
        else {
            currentIndex =
                currentIndex === 0 ? bounds.length - 1 : currentIndex - 1;
        }
        this.ui.currentIndex = currentIndex + 1;
        const bound = bounds[currentIndex];
        if (bound) {
            const rng = this.j.ed.createRange();
            try {
                rng.setStart(bound.startContainer, bound.startOffset);
                rng.setEnd(bound.endContainer, bound.endOffset);
                this.j.s.selectRange(rng);
            }
            catch (e) {
                !IS_PROD && console.error(e);
            }
            this.tryScrollToElement(bound.startContainer);
            await this.updateCounters();
            await this.drawPromise;
            this.j.e.fire('afterFindAndSelect');
            return true;
        }
        return false;
    }
    findCurrentIndexInRanges(bounds, range) {
        return bounds.findIndex(bound => bound.startContainer === range.startContainer &&
            bound.startOffset === range.startOffset &&
            bound.endContainer === range.startContainer &&
            bound.endOffset === range.endOffset);
    }
    async isValidCache(promise) {
        const res = await promise;
        return res.every(r => r.startContainer.isConnected &&
            r.startOffset <= (r.startContainer.nodeValue?.length ?? 0) &&
            r.endContainer.isConnected &&
            r.endOffset <= (r.endContainer.nodeValue?.length ?? 0));
    }
    async find(walker, query) {
        if (!query.length) {
            return [];
        }
        const cache = this.cache[query];
        if (cache && (await this.isValidCache(cache))) {
            return cache;
        }
        this.cache[query] = this.j.async.promise(resolve => {
            const sentence = new SentenceFinder(this.j.o.search.fuzzySearch);
            walker
                .on('break', () => {
                resolve([]);
            })
                .on('visit', (elm) => {
                if (Dom.isText(elm)) {
                    sentence.add(elm);
                }
                return false;
            })
                .on('end', () => {
                resolve(sentence.ranges(query) ?? []);
            })
                .setWork(this.j.editor);
        });
        return this.cache[query];
    }
    __drawSelectionRanges(ranges) {
        const { async, createInside: ci, editor } = this.j;
        async.cancelAnimationFrame(this.wrapFrameRequest);
        const parts = [...ranges];
        let sRange, total = 0;
        return async.promise(resolve => {
            const drawParts = () => {
                do {
                    sRange = parts.shift();
                    if (sRange) {
                        highlightTextRanges(this.j, sRange, parts, ci, editor);
                    }
                    total += 1;
                } while (sRange && total <= 5);
                if (parts.length) {
                    this.wrapFrameRequest =
                        async.requestAnimationFrame(drawParts);
                }
                else {
                    resolve();
                }
            };
            drawParts();
        });
    }
    onAfterGetValueFromEditor(data) {
        data.value = clearSelectionWrappersFromHTML(data.value);
    }
    /** @override */
    afterInit(editor) {
        if (editor.o.useSearch) {
            const self = this;
            editor.e
                .on('beforeSetMode.search', () => {
                this.ui.close();
            })
                .on(this.ui, 'afterClose', () => {
                clearSelectionWrappers(editor.editor);
                this.ui.currentIndex = 0;
                this.ui.count = 0;
                this.cache = {};
            })
                .on('click', () => {
                this.ui.currentIndex = 0;
                clearSelectionWrappers(editor.editor);
            })
                .on('change.search', () => {
                this.cache = {};
            })
                .on('keydown.search mousedown.search', editor.async.debounce(() => {
                if (this.ui.selInfo) {
                    editor.s.removeMarkers();
                    this.ui.selInfo = null;
                }
                if (this.ui.isOpened) {
                    this.updateCounters();
                }
            }, editor.defaultTimeout))
                .on('searchNext.search searchPrevious.search', () => {
                if (!this.ui.isOpened) {
                    this.ui.open();
                }
                return self
                    .findAndSelect(self.ui.query, editor.e.current === 'searchNext')
                    .catch(e => {
                    !IS_PROD && console.error('Search error', e);
                });
            })
                .on('search.search', (value, next = true) => {
                this.ui.currentIndex = 0;
                return self.findAndSelect(value || '', next).catch(e => {
                    !IS_PROD && console.error('Search error', e);
                });
            });
            editor
                .registerCommand('search', {
                exec: (command, value, next = true) => {
                    value &&
                        self.findAndSelect(value, next).catch(e => {
                            !IS_PROD && console.error('Search error', e);
                        });
                    return false;
                }
            })
                .registerCommand('openSearchDialog', {
                exec: (command, value) => {
                    self.ui.open(value);
                    return false;
                },
                hotkeys: ['ctrl+f', 'cmd+f']
            })
                .registerCommand('openReplaceDialog', {
                exec: (command, query, replace) => {
                    if (!editor.o.readonly) {
                        self.ui.open(query, replace, true);
                    }
                    return false;
                },
                hotkeys: ['ctrl+h', 'cmd+h']
            });
        }
    }
    /** @override */
    beforeDestruct(jodit) {
        this.ui.destruct();
        jodit.e.off('.search');
    }
}
__decorate([
    cache
], search.prototype, "ui", null);
__decorate([
    watch('ui:needUpdateCounters')
], search.prototype, "updateCounters", null);
__decorate([
    watch('ui:pressReplaceButton')
], search.prototype, "onPressReplaceButton", null);
__decorate([
    autobind
], search.prototype, "findQueryBounds", null);
__decorate([
    autobind
], search.prototype, "findAndReplace", null);
__decorate([
    autobind
], search.prototype, "findAndSelect", null);
__decorate([
    autobind
], search.prototype, "find", null);
__decorate([
    watch(':afterGetValueFromEditor')
], search.prototype, "onAfterGetValueFromEditor", null);
pluginSystem.add('search', search);
