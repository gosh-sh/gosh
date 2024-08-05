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
import { cache, cached, watch } from "../../core/decorators/index.js";
import { Dom } from "../../core/dom/dom.js";
import { pluginSystem } from "../../core/global.js";
import { isAbortError, isNumeric, markOwner } from "../../core/helpers/index.js";
import { Plugin } from "../../core/plugin/plugin.js";
import { Button } from "../../core/ui/button/index.js";
import "./config.js";
import { UIImagePropertiesForm } from "./ui/ui-image-form.js";
import { openImageEditorDialog } from "./utils/open-image-editor.js";
import { openImagePopup } from "./utils/open-image-popup.js";
import { readValuesFromImage } from "./readers/index.js";
import { applyValuesToImage } from "./writers/index.js";
/**
 * Plug-in for image editing window
 *
 * @example
 * ```javascript
 * const editor = Jodit.make('#editor', {
 *     image: {
 *         editSrc: false,
 *         editLink: false
 *     }
 * });
 * ```
 */
/**
 * Show dialog with image's options
 */
export class imageProperties extends Plugin {
    constructor() {
        super(...arguments);
        this.state = {
            image: new Image(),
            sourceImage: new Image(),
            get ratio() {
                const { naturalWidth, naturalHeight } = this.image;
                return naturalWidth / naturalHeight || 1;
            },
            sizeIsLocked: true,
            marginIsLocked: true,
            values: {
                style: '',
                imageSrc: '',
                borderRadius: 0,
                imageTitle: '',
                imageAlt: '',
                imageLink: '',
                imageLinkOpenInNewTab: false,
                imageWidth: 0,
                imageHeight: 0,
                marginTop: 0,
                marginRight: 0,
                marginBottom: 0,
                marginLeft: 0,
                classes: '',
                id: '',
                align: ''
            }
        };
        this.activeTabState = {
            activeTab: 'Image'
        };
    }
    get form() {
        return new UIImagePropertiesForm(this.j, this.state, this.activeTabState, {
            openImageEditor: () => openImageEditorDialog(this.j, this.state),
            openImagePopup: target => openImagePopup(this.j, this.dialog, this.state, target)
        });
    }
    /**
     * Dialog for form
     */
    get dialog() {
        const { j } = this;
        const dialog = j.dlg({
            minWidth: Math.min(400, screen.width),
            minHeight: 590,
            buttons: ['fullsize', 'dialog.close']
        });
        const buttons = this.__buttons;
        buttons.check.onAction(() => {
            applyValuesToImage(j, this.state, this.state.sourceImage);
            j.synchronizeValues();
            dialog.close();
        });
        buttons.remove.onAction(() => {
            j.s.removeNode(this.state.sourceImage);
            dialog.close();
        });
        buttons.cancel.onAction(() => {
            dialog.close();
        });
        dialog.setHeader(j.i18n('Image properties'));
        dialog.setContent(this.form);
        dialog.setFooter([[buttons.cancel, buttons.remove], buttons.check]);
        j.e.on(dialog, 'afterClose', () => {
            if (this.state.image.parentNode &&
                j.o.image.selectImageAfterClose) {
                j.s.select(this.state.sourceImage);
            }
        });
        dialog.setSize(j.o.image.dialogWidth);
        markOwner(j, dialog.container);
        return dialog;
    }
    get __buttons() {
        const { j } = this;
        return {
            check: Button(j, 'ok', 'Apply', 'primary'),
            remove: Button(j, 'bin', 'Delete'),
            cancel: Button(j, 'cancel', 'Cancel')
        };
    }
    /**
     * Open dialog editing image properties
     *
     * @example
     * ```javascript
     * const editor = Jodit.makeJodit('#editor');
     *     img = editor.createInside.element('img');
     *
     * img.setAttribute('src', 'images/some-image.png');
     * editor.s.insertImage(img);
     * // open the properties of the editing window
     * editor.events.fire('openImageProperties', img);
     * ```
     */
    open() {
        this.activeTabState.activeTab = 'Image';
        this.__lock();
        this.dialog.open().setModal(true).setPosition();
        this.async
            .promise((resolve, reject) => readValuesFromImage(this.j, this.state).then(resolve, reject))
            .catch((e) => {
            if (!isAbortError(e)) {
                this.dialog.message.error(e.message);
            }
        })
            .finally(() => this.__unlock());
        return false;
    }
    __lock() {
        this.dialog.lock();
        this.form.setMod('lock', true);
        Object.values(this.__buttons).forEach(b => (b.state.disabled = true));
    }
    __unlock() {
        this.dialog.unlock();
        this.form.setMod('lock', false);
        Object.values(this.__buttons).forEach(b => (b.state.disabled = false));
    }
    /** @override **/
    afterInit(editor) {
        const self = this;
        editor.e
            .on('afterConstructor changePlace', () => {
            editor.e
                .off(editor.editor, '.imageproperties')
                .on(editor.editor, 'dblclick.imageproperties', (e) => {
                const image = e.target;
                if (!Dom.isTag(image, 'img')) {
                    return;
                }
                if (editor.o.image.openOnDblClick) {
                    if (this.j.e.fire('openOnDblClick', image) ===
                        false) {
                        return;
                    }
                    self.state.sourceImage = image;
                    self.state.image = image.cloneNode(true);
                    if (!editor.o.readonly) {
                        e.stopImmediatePropagation();
                        e.preventDefault();
                        self.open();
                    }
                }
                else {
                    e.stopImmediatePropagation();
                    editor.s.select(image);
                }
            });
        })
            .on('openImageProperties.imageproperties', (image) => {
            self.state.sourceImage = image;
            this.state.image = image.cloneNode(true);
            this.open();
        });
    }
    async onStateValuesImageSrcChange() {
        const { image, values } = this.state;
        if (!image.src) {
            return;
        }
        try {
            this.__lock();
            await image.decode();
            if (this.state.sizeIsLocked && isNumeric(values.imageWidth)) {
                const w = parseFloat(values.imageWidth.toString());
                values.imageHeight = Math.round(w / this.state.ratio);
            }
            this.j.e.fire('updateImageProperties.imageproperties', image);
        }
        catch (e) {
            this.j.alert(e.message);
        }
        finally {
            this.__unlock();
        }
    }
    /** @override */
    beforeDestruct(editor) {
        Object.values(cached(this, '__buttons') ?? {}).forEach(b => b.destruct());
        cached(this, 'dialog')?.destruct();
        cached(this, 'form')?.destruct();
        editor.e.off(editor.editor, '.imageproperties').off('.imageproperties');
    }
}
__decorate([
    cache
], imageProperties.prototype, "form", null);
__decorate([
    cache
], imageProperties.prototype, "dialog", null);
__decorate([
    cache
], imageProperties.prototype, "__buttons", null);
__decorate([
    watch('state.image')
], imageProperties.prototype, "onStateValuesImageSrcChange", null);
pluginSystem.add('imageProperties', imageProperties);
