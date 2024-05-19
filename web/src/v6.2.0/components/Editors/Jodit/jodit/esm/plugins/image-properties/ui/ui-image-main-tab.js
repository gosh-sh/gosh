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
import { UIGroup } from "../../../core/ui/group/group.js";
/** @private */
let UIImageMainTab = class UIImageMainTab extends UIGroup {
    className() {
        return 'UIImageMainTab';
    }
    appendChildToContainer() {
        // Do nothing
    }
    constructor(view, state, handlers) {
        super(view);
        this.state = state;
        this.handlers = handlers;
    }
    render() {
        return `<div class="jodit-form__group &__editSrc">
			<label>~Src~</label>
			<div class="jodit-input_group">
				<input class="jodit-input &__imageSrc" type="text"/>
				<div class="jodit-input_group-buttons &__fixImage">
						<a class="jodit-button &__changeImage">*image*</a>
						<a class="jodit-button &__editImage">*crop*</a>
				</div>
			</div>
		</div>
		<div class="jodit-form__group &__editTitle">
			<label>~Title~</label>
			<input type="text" class="jodit-input &__imageTitle"/>
		</div>
		<div class="jodit-form__group &__editAlt">
			<label>~Alternative~</label>
			<input type="text" class="jodit-input &__imageAlt"/>
		</div>
		<div class="jodit-form__group &__editLink">
			<label>~Link~</label>
			<input type="text" class="jodit-input &__imageLink"/>
		</div>
		<div class="jodit-form__group &__editLinkTarget">
			<label class="jodit_vertical_middle">
				<input type="checkbox" class="jodit-checkbox &__imageLinkOpenInNewTab"/>
				<span>~Open link in new tab~</span>
			</label>
		</div>`;
    }
    async onStateImageSrcChange() {
        const imageSrc = this.getElm('imageSrc');
        imageSrc.value = this.state.values.imageSrc;
    }
    onImageSrcChange() {
        this.state.values.imageSrc = this.getElm('imageSrc').value;
    }
    /**
     * Open image editor
     */
    onEditImageClick(e) {
        this.handlers.openImageEditor();
        e.stopPropagation();
    }
    /**
     * Open popup with filebrowser/uploader buttons for image
     */
    onChangeImageClick(e) {
        this.handlers.openImagePopup(this.getElm('changeImage'));
        e.stopPropagation();
    }
    onStateTitleChange() {
        const title = this.getElm('imageTitle');
        title.value = this.state.values.imageTitle;
    }
    onTitleChange() {
        this.state.values.imageTitle = this.getElm('imageTitle').value;
    }
    onStateAltChange() {
        const alt = this.getElm('imageAlt');
        alt.value = this.state.values.imageAlt;
    }
    onAltChange() {
        this.state.values.imageAlt = this.getElm('imageAlt').value;
    }
    onStateImageLinkChange() {
        const imageLink = this.getElm('imageLink');
        imageLink.value = this.state.values.imageLink;
    }
    onImageLinkChange() {
        this.state.values.imageLink = this.getElm('imageLink').value;
    }
    onStateImageLinkOpenInNewTabChange() {
        const imageLinkOpenInNewTab = this.getElm('imageLinkOpenInNewTab');
        imageLinkOpenInNewTab.checked = this.state.values.imageLinkOpenInNewTab;
    }
    onImageLinkOpenInNewTabChange() {
        this.state.values.imageLinkOpenInNewTab = this.getElm('imageLinkOpenInNewTab').checked;
    }
    hideFieldByOptions() {
        const o = this.j.o;
        const opt = o.image;
        [
            ['editSrc', 'editSrc'],
            ['editTitle', 'editTitle'],
            ['editAlt', 'editAlt'],
            ['editLink', 'editLink'],
            ['editLink', 'editLinkTarget'],
            ['useImageEditor', 'editImage']
        ].forEach(([optKey, elmKey]) => {
            const elm = this.getElm(elmKey);
            css(elm, 'display', opt[optKey] ? null : 'none');
        });
        const changeImage = this.getElm('changeImage');
        const needShowChangeImage = Boolean(o.filebrowser.ajax.url || o.uploader.url);
        css(changeImage, 'display', needShowChangeImage ? null : 'none');
        const editImage = this.getElm('editImage');
        const needShowEditImage = Boolean(o.filebrowser.ajax.url) && opt.useImageEditor;
        css(editImage, 'display', needShowEditImage ? null : 'none');
        const fixImage = this.getElm('fixImage');
        css(fixImage, 'display', needShowChangeImage || needShowEditImage ? null : 'none');
    }
};
__decorate([
    watch('state.values.imageSrc')
], UIImageMainTab.prototype, "onStateImageSrcChange", null);
__decorate([
    watch('imageSrc:change')
], UIImageMainTab.prototype, "onImageSrcChange", null);
__decorate([
    watch('editImage:click')
], UIImageMainTab.prototype, "onEditImageClick", null);
__decorate([
    watch('changeImage:click')
], UIImageMainTab.prototype, "onChangeImageClick", null);
__decorate([
    watch('state.values.imageTitle')
], UIImageMainTab.prototype, "onStateTitleChange", null);
__decorate([
    watch('imageTitle:change')
], UIImageMainTab.prototype, "onTitleChange", null);
__decorate([
    watch('state.values.imageAlt')
], UIImageMainTab.prototype, "onStateAltChange", null);
__decorate([
    watch('imageAlt:change')
], UIImageMainTab.prototype, "onAltChange", null);
__decorate([
    watch('state.values.imageLink')
], UIImageMainTab.prototype, "onStateImageLinkChange", null);
__decorate([
    watch('imageLink:change')
], UIImageMainTab.prototype, "onImageLinkChange", null);
__decorate([
    watch('state.values.imageLinkOpenInNewTab')
], UIImageMainTab.prototype, "onStateImageLinkOpenInNewTabChange", null);
__decorate([
    watch('imageLinkOpenInNewTab:change')
], UIImageMainTab.prototype, "onImageLinkOpenInNewTabChange", null);
__decorate([
    hook('ready')
], UIImageMainTab.prototype, "hideFieldByOptions", null);
UIImageMainTab = __decorate([
    component
], UIImageMainTab);
export { UIImageMainTab };
