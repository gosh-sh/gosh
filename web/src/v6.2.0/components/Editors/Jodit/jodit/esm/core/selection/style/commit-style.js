/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { IS_BLOCK, LIST_TAGS } from "../../constants.js";
import { camelCase } from "../../helpers/string/camel-case.js";
import { _PREFIX } from "./constants.js";
import { ApplyStyle } from "./apply-style.js";
export class CommitStyle {
    isApplied(elm, key) {
        const data = this.__applyMap.get(elm);
        if (!data) {
            return false;
        }
        return data[key];
    }
    setApplied(elm, key) {
        const data = this.__applyMap.get(elm) ?? {};
        data[key] = true;
        this.__applyMap.set(elm, data);
    }
    get elementIsList() {
        return Boolean(this.options.element && LIST_TAGS.has(this.options.element));
    }
    get element() {
        return this.options.element || this.defaultTag;
    }
    /**
     * New element is blocked
     */
    get elementIsBlock() {
        return Boolean(this.options.element && IS_BLOCK.test(this.options.element));
    }
    /**
     * The commit applies the tag change
     */
    get isElementCommit() {
        return Boolean(this.options.element &&
            this.options.element !== this.options.defaultTag);
    }
    get defaultTag() {
        if (this.options.defaultTag) {
            return this.options.defaultTag;
        }
        return this.elementIsBlock ? 'p' : 'span';
    }
    get elementIsDefault() {
        return this.element === this.defaultTag;
    }
    constructor(options) {
        this.options = options;
        this.__applyMap = new WeakMap();
    }
    apply(jodit) {
        const { hooks } = this.options;
        const keys = (hooks ? Object.keys(hooks) : []);
        try {
            keys.forEach(key => {
                jodit.e.on(camelCase(_PREFIX + '_' + key), hooks[key]);
            });
            ApplyStyle(jodit, this);
        }
        finally {
            keys.forEach(key => {
                jodit.e.off(camelCase(_PREFIX + '_' + key), hooks[key]);
            });
            this.__applyMap = new WeakMap();
        }
        jodit.synchronizeValues();
        jodit.e.fire('afterCommitStyle', this);
    }
}
