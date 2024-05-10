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
import { debounce, hook, watch } from "../../../core/decorators/index.js";
import { component } from "../../../core/decorators/component/component.js";
import { attr, css, isNumeric } from "../../../core/helpers/index.js";
import { UIGroup } from "../../../core/ui/group/group.js";
import { Icon } from "../../../core/ui/icon.js";
import { TabsWidget } from "../../../modules/widget/index.js";
import { UIImageMainTab } from "./ui-image-main-tab.js";
import { UIImagePositionTab } from "./ui-image-position-tab.js";
/** @private */
let UIImagePropertiesForm = class UIImagePropertiesForm extends UIGroup {
    className() {
        return 'UIImagePropertiesForm';
    }
    appendChildToContainer() { }
    getElm(elementName) {
        const selfElm = super.getElm(elementName);
        if (selfElm) {
            return selfElm;
        }
        for (const child of this.elements) {
            const elm = child.getElm(elementName);
            if (elm) {
                return elm;
            }
        }
        return null;
    }
    constructor(jodit, state, activeTabState, handlers) {
        super(jodit);
        this.state = state;
        this.handlers = handlers;
        this.__mainTab = new UIImageMainTab(this.jodit, this.state, this.handlers);
        this.__positionTab = new UIImagePositionTab(this.jodit, this.state, this.handlers);
        this.getElm('tabsBox').appendChild(TabsWidget(jodit, [
            { name: 'Image', content: this.__mainTab },
            { name: 'Advanced', content: this.__positionTab }
        ], activeTabState));
        this.setMod('lock-size', this.state.sizeIsLocked);
        this.append(this.__mainTab).append(this.__positionTab);
    }
    render() {
        return `<form>
		<div class="jodit-grid jodit-grid_xs-column">
			<div class="jodit_col-lg-2-5 jodit_col-xs-5-5">
				<div class="&__view-box">
					<div class="&__imageView">
						<img class="&__imageViewSrc" src="" alt=""/>
					</div>
					<div class="jodit-form__group &__imageSizes">
						<input type="text" class="jodit-input &__imageWidth"/>
						<a class="&__lockSize">${Icon.get('lock')}</a>
						<input type="text" class="&__imageHeight jodit-input"/>
					</div>
				</div>
			</div>
			<div class="jodit_col-lg-3-5 jodit_col-xs-5-5 &__tabsBox"></div>
		</div>
	</form>`;
    }
    onChangeSizeIsLocked() {
        const lockSize = this.getElm('lockSize');
        const imageWidth = this.getElm('imageWidth');
        lockSize.innerHTML = Icon.get(this.state.sizeIsLocked ? 'lock' : 'unlock');
        this.setMod('lock-size', this.state.sizeIsLocked);
        this.j.e.fire(imageWidth, 'change');
    }
    onLockSizeClick() {
        this.state.sizeIsLocked = !this.state.sizeIsLocked;
    }
    onStateValuesSizeChange() {
        const imageWidth = this.getElm('imageWidth');
        const imageHeight = this.getElm('imageHeight');
        if (imageWidth !== this.j.od.activeElement) {
            imageWidth.value = this.state.values.imageWidth.toString();
        }
        if (imageHeight !== this.j.od.activeElement) {
            imageHeight.value = this.state.values.imageHeight.toString();
        }
    }
    onImageWidthChange(e) {
        const imageWidth = this.getElm('imageWidth');
        const imageHeight = this.getElm('imageHeight');
        if (!this.state.sizeIsLocked ||
            !isNumeric(imageWidth.value) ||
            !isNumeric(imageHeight.value)) {
            this.state.values.imageWidth = imageWidth.value;
            this.state.values.imageHeight = imageHeight.value;
            return;
        }
        const w = parseFloat(imageWidth.value), h = parseFloat(imageHeight.value);
        if (e.target === imageWidth) {
            this.state.values.imageWidth = w;
            this.state.values.imageHeight = Math.round(w / this.state.ratio);
        }
        else {
            this.state.values.imageWidth = Math.round(h * this.state.ratio);
            this.state.values.imageHeight = h;
        }
    }
    onStateValuesImageSrcChange() {
        const { imageSrc } = this.state.values;
        if (!imageSrc) {
            return;
        }
        const imageViewSrc = this.getElm('imageViewSrc');
        attr(imageViewSrc, 'src', imageSrc);
        const image = new Image();
        image.src = imageSrc;
        this.state.image = image;
    }
    hideFieldByOptions() {
        const opt = this.j.o.image;
        [
            ['editSize', 'imageSizes'],
            ['showPreview', 'imageView']
        ].forEach(([optKey, elmKey]) => {
            const elm = this.getElm(elmKey);
            css(elm, 'display', opt[optKey] ? null : 'none');
        });
    }
};
__decorate([
    hook('ready'),
    watch('state.sizeIsLocked')
], UIImagePropertiesForm.prototype, "onChangeSizeIsLocked", null);
__decorate([
    watch('lockSize:click')
], UIImagePropertiesForm.prototype, "onLockSizeClick", null);
__decorate([
    hook('ready'),
    watch(['state.values.imageWidth', 'state.values.imageHeight'])
], UIImagePropertiesForm.prototype, "onStateValuesSizeChange", null);
__decorate([
    watch([
        'imageWidth:change',
        'imageHeight:change',
        'imageWidth:keydown',
        'imageHeight:keydown',
        'imageWidth:mousedown',
        'imageHeight:mousedown',
        'imageWidth:paste',
        'imageHeight:paste'
    ]),
    debounce()
], UIImagePropertiesForm.prototype, "onImageWidthChange", null);
__decorate([
    hook('ready'),
    watch('state.values.imageSrc')
], UIImagePropertiesForm.prototype, "onStateValuesImageSrcChange", null);
__decorate([
    hook('ready')
], UIImagePropertiesForm.prototype, "hideFieldByOptions", null);
UIImagePropertiesForm = __decorate([
    component
], UIImagePropertiesForm);
export { UIImagePropertiesForm };
