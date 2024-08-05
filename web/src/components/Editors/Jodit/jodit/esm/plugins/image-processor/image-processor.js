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
import { SOURCE_CONSUMER } from "../../core/constants.js";
import { debounce, watch } from "../../core/decorators/index.js";
import { pluginSystem } from "../../core/global.js";
import { $$, dataBind } from "../../core/helpers/index.js";
import { Plugin } from "../../core/plugin/index.js";
import "./config.js";
const JODIT_IMAGE_PROCESSOR_BINDED = '__jodit_imageprocessor_binded';
const JODIT_IMAGE_BLOB_ID = JODIT_IMAGE_PROCESSOR_BINDED + 'blob-id';
/**
 * Change editor's size after load all images
 */
export class imageProcessor extends Plugin {
    afterInit(jodit) { }
    beforeDestruct(jodit) {
        const list = jodit.buffer.get(JODIT_IMAGE_BLOB_ID);
        if (list) {
            const keys = Object.keys(list);
            for (const uri of keys) {
                URL.revokeObjectURL(uri);
            }
            jodit.buffer.delete(JODIT_IMAGE_BLOB_ID);
        }
    }
    onAfterGetValueFromEditor(data, consumer) {
        if (consumer !== SOURCE_CONSUMER) {
            return this.onBeforeSetElementValue(data);
        }
    }
    onBeforeSetElementValue(data) {
        const { jodit: editor } = this;
        if (!editor.o.imageProcessor.replaceDataURIToBlobIdInView) {
            return;
        }
        const list = editor.buffer.get(JODIT_IMAGE_BLOB_ID);
        if (list) {
            const keys = Object.keys(list);
            for (const uri of keys) {
                while (data.value.includes(uri)) {
                    data.value = data.value.replace(uri, list[uri]);
                }
            }
        }
    }
    async afterChange(data) {
        const { jodit: editor } = this;
        if (!editor.editor) {
            return;
        }
        $$('img', editor.editor).forEach(elm => {
            if (!dataBind(elm, JODIT_IMAGE_PROCESSOR_BINDED)) {
                dataBind(elm, JODIT_IMAGE_PROCESSOR_BINDED, true);
                if (!elm.complete) {
                    editor.e.on(elm, 'load', function ElementOnLoad() {
                        !editor.isInDestruct && editor.e?.fire('resize');
                        editor.e.off(elm, 'load', ElementOnLoad);
                    });
                }
                if (elm.src && /^data:/.test(elm.src)) {
                    replaceDataURIToBlobUUID(editor, elm);
                }
                editor.e.on(elm, 'mousedown touchstart', () => {
                    editor.s.select(elm);
                });
            }
        });
    }
}
__decorate([
    watch(':afterGetValueFromEditor')
], imageProcessor.prototype, "onAfterGetValueFromEditor", null);
__decorate([
    watch(':beforeSetElementValue')
], imageProcessor.prototype, "onBeforeSetElementValue", null);
__decorate([
    watch([':change', ':afterInit', ':changePlace']),
    debounce()
], imageProcessor.prototype, "afterChange", null);
function replaceDataURIToBlobUUID(editor, elm) {
    if (!editor.o.imageProcessor.replaceDataURIToBlobIdInView) {
        return;
    }
    if (typeof ArrayBuffer === 'undefined' || typeof URL === 'undefined') {
        return;
    }
    const dataUri = elm.src, blob = dataURItoBlob(dataUri);
    elm.src = URL.createObjectURL(blob);
    editor.e.fire('internalUpdate');
    const { buffer } = editor;
    const list = buffer.get(JODIT_IMAGE_BLOB_ID) || {};
    list[elm.src] = dataUri;
    editor.buffer.set(JODIT_IMAGE_BLOB_ID, list);
}
// https://stackoverflow.com/a/12300351
function dataURItoBlob(dataURI) {
    // convert base64 to raw binary data held in a string
    // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
    const byteString = atob(dataURI.split(',')[1]);
    // separate out the mime component
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    // write the bytes of the string to an ArrayBuffer
    const ab = new ArrayBuffer(byteString.length);
    // create a view into the buffer
    const ia = new Uint8Array(ab);
    // set the bytes of the buffer to the correct values
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    // write the ArrayBuffer to a blob, and you're done
    return new Blob([ab], { type: mimeString });
}
pluginSystem.add('imageProcessor', imageProcessor);
