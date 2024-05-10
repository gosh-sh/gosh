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
import { component } from "../../../core/decorators/component/component.js";
import { hook } from "../../../core/decorators/hook/hook.js";
import { watch } from "../../../core/decorators/watch/watch.js";
import { css } from "../../../core/helpers/index.js";
import { isString } from "../../../core/helpers/checker/is-string.js";
import { attr } from "../../../core/helpers/utils/attr.js";
import { UIElement } from "../../../core/ui/element.js";
import { Icon } from "../../../core/ui/icon.js";
import { normalSizeFromString } from "../utils/utils.js";
/** @private */
let UIImagePositionTab = class UIImagePositionTab extends UIElement {
    className() {
        return 'UIImagePositionTab';
    }
    constructor(jodit, state, handlers) {
        super(jodit, {
            availableClasses: jodit.o.image.availableClasses
        });
        this.state = state;
        this.handlers = handlers;
    }
    render({ availableClasses }) {
        return `<div class="jodit-form__group &__editMargins">
			<label>~Margins~</label>
			<div class="jodit-grid jodit_vertical_middle">
				<input class="jodit_col-lg-1-5 jodit-input &__marginTop" type="text" placeholder="~top~"/>
				<a style="text-align: center;" class="jodit-properties__lock jodit_col-lg-1-5 &__lockMargin">*lock*</a>
				<input disabled="disabled" class="jodit_col-lg-1-5 jodit-input &__marginRight" type="text" placeholder="~right~"/>
				<input disabled="disabled" class="jodit_col-lg-1-5 jodit-input &__marginBottom" type="text" placeholder="~bottom~"/>
				<input disabled="disabled" class="jodit_col-lg-1-5 jodit-input &__marginLeft" type="text" placeholder="~left~"/>
			</div>
		</div>
		<div class="jodit-form__group &__editAlign">
			<label>~Align~</label>
			<select class="jodit-select &__align">
				<option value="">~--Not Set--~</option>
				<option value="left">~Left~</option>
				<option value="center">~Center~</option>
				<option value="right">~Right~</option>
			</select>
		</div>
		<div class="jodit-form__group &__editStyle">
			<label>~Styles~</label>
			<input type="text" class="jodit-input &__style"/>
		</div>
		<div class="jodit-form__group &__editClass">
			<label>~Classes~</label>
			${(() => {
            const classInput = [];
            if (availableClasses && availableClasses.length > 0) {
                classInput.push('<select class="jodit-input jodit-select &__classes">');
                availableClasses.forEach(item => {
                    if (isString(item)) {
                        classInput.push(`<option value="${item}">${item}</option>`);
                    }
                    else {
                        classInput.push(`<option value="${item[0]}">${item[1]}</option>`);
                    }
                });
                classInput.push('</select>');
            }
            else {
                classInput.push('<input type="text" class="jodit-input &__classes"/>');
            }
            return classInput.join('');
        })()}
		</div>
		<div class="jodit-form__group &__editId">
			<label>Id</label>
			<input type="text" class="jodit-input &__id"/>
		</div>
		<div
			class="jodit-form__group &__editBorderRadius"
		>
			<label>~Border radius~</label>
			<input type="number" class="jodit-input &__borderRadius"/>
		</div>`;
    }
    onStateAlignChange() {
        const align = this.getElm('align');
        align.value = this.state.values.align;
    }
    onChangeAlign() {
        const align = this.getElm('align');
        this.state.values.align = align.value;
    }
    onStateValuesBorderRadiusChange() {
        const borderRadius = this.getElm('borderRadius');
        borderRadius.value = this.state.values.borderRadius.toString();
    }
    onChangeBorderRadius() {
        const borderRadius = this.getElm('borderRadius');
        this.state.values.borderRadius = parseFloat(borderRadius.value);
    }
    onStateValuesIdChange() {
        const id = this.getElm('id');
        id.value = this.state.values.id;
    }
    onChangeId() {
        const id = this.getElm('id');
        this.state.values.id = id.value;
    }
    onStateValuesStyleChange() {
        const style = this.getElm('style');
        style.value = this.state.values.style;
    }
    onChangeStyle() {
        const style = this.getElm('style');
        this.state.values.style = style.value;
    }
    onStateValuesClassesChange() {
        const classes = this.getElm('classes');
        classes.value = this.state.values.classes;
    }
    onChangClasses() {
        const classes = this.getElm('classes');
        this.state.values.classes = classes.value;
    }
    onLockMarginClick(e) {
        this.state.marginIsLocked = !this.state.marginIsLocked;
        e.preventDefault();
    }
    onChangeMarginIsLocked() {
        const marginBottom = this.getElm('marginBottom');
        const marginRight = this.getElm('marginRight');
        const marginLeft = this.getElm('marginLeft');
        const lockMargin = this.getElm('lockMargin');
        [marginRight, marginBottom, marginLeft].forEach(elm => {
            attr(elm, 'disabled', this.state.marginIsLocked || null);
        });
        lockMargin.innerHTML = Icon.get(this.state.marginIsLocked ? 'lock' : 'unlock');
        if (this.state.marginIsLocked) {
            const marginTop = this.state.values.marginTop;
            this.state.values.marginRight = marginTop;
            this.state.values.marginBottom = marginTop;
            this.state.values.marginLeft = marginTop;
        }
    }
    onStateValuesMarginChange() {
        const marginTop = this.getElm('marginTop');
        const marginRight = this.getElm('marginRight');
        const marginBottom = this.getElm('marginBottom');
        const marginLeft = this.getElm('marginLeft');
        marginTop.value = this.state.values.marginTop.toString();
        marginRight.value = this.state.values.marginRight.toString();
        marginBottom.value = this.state.values.marginBottom.toString();
        marginLeft.value = this.state.values.marginLeft.toString();
    }
    onChangeMargin() {
        const marginTop = this.getElm('marginTop');
        const marginRight = this.getElm('marginRight');
        const marginBottom = this.getElm('marginBottom');
        const marginLeft = this.getElm('marginLeft');
        this.state.values.marginTop = normalSizeFromString(marginTop.value);
        if (this.state.marginIsLocked) {
            this.state.values.marginRight = this.state.values.marginTop;
            this.state.values.marginBottom = this.state.values.marginTop;
            this.state.values.marginLeft = this.state.values.marginTop;
        }
        else {
            this.state.values.marginRight = normalSizeFromString(marginRight.value);
            this.state.values.marginBottom = normalSizeFromString(marginBottom.value);
            this.state.values.marginLeft = normalSizeFromString(marginLeft.value);
        }
    }
    hideFieldByOptions() {
        const opt = this.j.o.image;
        [
            ['editMargins', 'editMargins'],
            ['editAlign', 'editAlign'],
            ['editStyle', 'editStyle'],
            ['editClass', 'editClass'],
            ['editId', 'editId'],
            ['editBorderRadius', 'editBorderRadius']
        ].forEach(([optKey, elmKey]) => {
            const elm = this.getElm(elmKey);
            css(elm, 'display', opt[optKey] ? null : 'none');
        });
    }
};
__decorate([
    hook('ready'),
    watch('state.values.align')
], UIImagePositionTab.prototype, "onStateAlignChange", null);
__decorate([
    watch('align:change')
], UIImagePositionTab.prototype, "onChangeAlign", null);
__decorate([
    hook('ready'),
    watch('state.values.borderRadius')
], UIImagePositionTab.prototype, "onStateValuesBorderRadiusChange", null);
__decorate([
    watch('borderRadius:change')
], UIImagePositionTab.prototype, "onChangeBorderRadius", null);
__decorate([
    hook('ready'),
    watch('state.values.id')
], UIImagePositionTab.prototype, "onStateValuesIdChange", null);
__decorate([
    watch('id:change')
], UIImagePositionTab.prototype, "onChangeId", null);
__decorate([
    hook('ready'),
    watch('state.values.style')
], UIImagePositionTab.prototype, "onStateValuesStyleChange", null);
__decorate([
    watch('style:change')
], UIImagePositionTab.prototype, "onChangeStyle", null);
__decorate([
    hook('ready'),
    watch('state.values.classes')
], UIImagePositionTab.prototype, "onStateValuesClassesChange", null);
__decorate([
    watch('classes:change')
], UIImagePositionTab.prototype, "onChangClasses", null);
__decorate([
    watch('lockMargin:click')
], UIImagePositionTab.prototype, "onLockMarginClick", null);
__decorate([
    hook('ready'),
    watch('state.marginIsLocked')
], UIImagePositionTab.prototype, "onChangeMarginIsLocked", null);
__decorate([
    hook('ready'),
    watch([
        'state.values.marginTop',
        'state.values.marginRight',
        'state.values.marginBottom',
        'state.values.marginLeft'
    ])
], UIImagePositionTab.prototype, "onStateValuesMarginChange", null);
__decorate([
    watch([
        'marginTop:change',
        'marginRight:change',
        'marginBottom:change',
        'marginLeft:change'
    ])
], UIImagePositionTab.prototype, "onChangeMargin", null);
__decorate([
    hook('ready')
], UIImagePositionTab.prototype, "hideFieldByOptions", null);
UIImagePositionTab = __decorate([
    component
], UIImagePositionTab);
export { UIImagePositionTab };
