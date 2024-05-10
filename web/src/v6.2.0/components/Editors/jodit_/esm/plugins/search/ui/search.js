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
import { MODE_WYSIWYG } from "../../../core/constants.js";
import * as consts from "../../../core/constants.js";
import { autobind, component, watch } from "../../../core/decorators/index.js";
import { Dom } from "../../../core/dom/index.js";
import { css, position, refs, trim } from "../../../core/helpers/index.js";
import { Icon, UIElement } from "../../../core/ui/index.js";
let UISearch = class UISearch extends UIElement {
    className() {
        return 'UISearch';
    }
    render() {
        return `<div>
			<div class="&__box">
				<div class="&__inputs">
					<input data-ref="query" tabindex="0" placeholder="~Search for~" type="text"/>
					<input data-ref="replace" tabindex="0" placeholder="~Replace with~" type="text"/>
				</div>
				<div class="&__counts">
					<span data-ref="counter-box">
						<span data-ref="current">0</span><span>/</span><span data-ref="count">0</span>
					</span>
				</div>
				<div class="&__buttons">
					<button data-ref="next" tabindex="0" type="button">${Icon.get('angle-down')}</button>
					<button data-ref="prev" tabindex="0" type="button">${Icon.get('angle-up')}</button>
					<button data-ref="cancel" tabindex="0" type="button">${Icon.get('cancel')}</button>
					<button data-ref="replace-btn" tabindex="0" type="button" class="jodit-ui-button">~Replace~</button>
				</div>
			</div>
		</div>`;
    }
    get currentIndex() {
        return this._currentIndex;
    }
    set currentIndex(value) {
        this._currentIndex = value;
        this.currentBox.innerText = value.toString();
    }
    set count(value) {
        this.countBox.innerText = value.toString();
    }
    get query() {
        return this.queryInput.value;
    }
    get replace() {
        return this.replaceInput.value;
    }
    constructor(jodit) {
        super(jodit);
        this.selInfo = null;
        this._currentIndex = 0;
        this.isOpened = false;
        const { query, replace, cancel, next, prev, replaceBtn, current, count } = refs(this.container);
        this.queryInput = query;
        this.replaceInput = replace;
        this.closeButton = cancel;
        this.replaceButton = replaceBtn;
        this.currentBox = current;
        this.countBox = count;
        jodit.e
            .on(this.closeButton, 'pointerdown', () => {
            this.close();
            return false;
        })
            .on(this.queryInput, 'input', () => {
            this.currentIndex = 0;
        })
            .on(this.queryInput, 'pointerdown', () => {
            if (jodit.s.isFocused()) {
                jodit.s.removeMarkers();
                this.selInfo = jodit.s.save();
            }
        })
            .on(this.replaceButton, 'pointerdown', () => {
            jodit.e.fire(this, 'pressReplaceButton');
            return false;
        })
            .on(next, 'pointerdown', () => {
            jodit.e.fire('searchNext');
            return false;
        })
            .on(prev, 'pointerdown', () => {
            jodit.e.fire('searchPrevious');
            return false;
        })
            .on(this.queryInput, 'input', () => {
            this.setMod('empty-query', !trim(this.queryInput.value).length);
        })
            .on(this.queryInput, 'keydown', this.j.async.debounce((e) => {
            switch (e.key) {
                case consts.KEY_ENTER:
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    if (jodit.e.fire('searchNext')) {
                        this.close();
                    }
                    break;
                default:
                    jodit.e.fire(this, 'needUpdateCounters');
                    break;
            }
        }, this.j.defaultTimeout));
    }
    onEditorKeyDown(e) {
        if (!this.isOpened) {
            return;
        }
        const { j } = this;
        if (j.getRealMode() !== MODE_WYSIWYG) {
            return;
        }
        switch (e.key) {
            case consts.KEY_ESC:
                this.close();
                break;
            case consts.KEY_F3:
                if (this.queryInput.value) {
                    j.e.fire(!e.shiftKey ? 'searchNext' : 'searchPrevious');
                    e.preventDefault();
                }
                break;
        }
    }
    open(query, replace, searchAndReplace = false) {
        if (!this.isOpened) {
            this.j.workplace.appendChild(this.container);
            this.isOpened = true;
        }
        this.calcSticky(this.j.e.fire('getStickyState.sticky') || false);
        this.j.e.fire('hidePopup');
        this.setMod('replace', searchAndReplace);
        // this.current = this.j.s.current();
        const selStr = query ?? (this.j.s.sel || '').toString();
        if (selStr) {
            this.queryInput.value = selStr;
        }
        if (replace) {
            this.replaceInput.value = replace;
        }
        this.setMod('empty-query', !selStr.length);
        this.j.e.fire(this, 'needUpdateCounters');
        if (selStr) {
            this.queryInput.select();
        }
        else {
            this.queryInput.focus();
        }
    }
    close() {
        if (!this.isOpened) {
            return;
        }
        this.j.s.restore();
        Dom.safeRemove(this.container);
        this.isOpened = false;
        this.j.e.fire(this, 'afterClose');
    }
    /**
     * Calculate position if sticky is enabled
     */
    calcSticky(enabled) {
        if (this.isOpened) {
            this.setMod('sticky', enabled);
            if (enabled) {
                const pos = position(this.j.toolbarContainer);
                css(this.container, {
                    top: pos.top + pos.height,
                    left: pos.left + pos.width
                });
            }
            else {
                css(this.container, {
                    top: null,
                    left: null
                });
            }
        }
    }
};
__decorate([
    watch([':keydown', 'queryInput:keydown'])
], UISearch.prototype, "onEditorKeyDown", null);
__decorate([
    autobind
], UISearch.prototype, "open", null);
__decorate([
    autobind
], UISearch.prototype, "close", null);
__decorate([
    watch(':toggleSticky')
], UISearch.prototype, "calcSticky", null);
UISearch = __decorate([
    component
], UISearch);
export { UISearch };
