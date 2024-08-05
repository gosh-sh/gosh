/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { isPromise } from "../checker/is-promise.js";
import { isVoid } from "../checker/is-void.js";
import { attr } from "./attr.js";
import { dataBind } from "./data-bind.js";
/**
 * Call function with parameters
 *
 * @example
 * ```js
 * const f = Math.random();
 * Jodit.modules.Helpers.call(f > 0.5 ? Math.ceil : Math.floor, f);
 * ```
 */
export function call(func, ...args) {
    return func(...args);
}
/**
 * Mark element for debugging
 */
export function markOwner(jodit, elm) {
    attr(elm, 'data-editor_id', jodit.id);
    !elm.component &&
        Object.defineProperty(elm, 'jodit', {
            value: jodit
        });
}
export function callPromise(condition, callback) {
    if (isPromise(condition)) {
        return condition
            .then(resp => resp, () => null)
            .finally(callback);
    }
    return callback?.();
}
/**
 * Allow load image in promise
 */
export const loadImage = (src, jodit) => jodit.async.promise((res, rej) => {
    const image = new Image(), onError = () => {
        jodit.e.off(image);
        rej?.();
    }, onSuccess = () => {
        jodit.e.off(image);
        res(image);
    };
    jodit.e
        .one(image, 'load', onSuccess)
        .one(image, 'error', onError)
        .one(image, 'abort', onError);
    image.src = src;
    if (image.complete) {
        onSuccess();
    }
});
export const keys = (obj, own = true) => {
    if (own) {
        return Object.keys(obj);
    }
    const props = [];
    for (const key in obj) {
        props.push(key);
    }
    return props;
};
/**
 * Memorize last user chose
 */
export const memorizeExec = (editor, _, { control }, preProcessValue) => {
    const key = `button${control.command}`;
    let value = (control.args && control.args[0]) ?? dataBind(editor, key);
    if (isVoid(value)) {
        return false;
    }
    dataBind(editor, key, value);
    if (preProcessValue) {
        value = preProcessValue(value);
    }
    editor.execCommand(control.command, false, value ?? undefined);
};
/**
 * Get DataTransfer from different event types
 */
export const getDataTransfer = (event) => {
    if (event.clipboardData) {
        return event.clipboardData;
    }
    try {
        return event.dataTransfer || new DataTransfer();
    }
    catch {
        return null;
    }
};
