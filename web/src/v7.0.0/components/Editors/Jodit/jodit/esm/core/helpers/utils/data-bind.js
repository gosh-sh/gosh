/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { isViewObject } from "../checker/is-view-object.js";
const store = new WeakMap();
export const dataBind = (elm, key, value) => {
    let itemStore = store.get(elm);
    if (!itemStore) {
        itemStore = {};
        store.set(elm, itemStore);
        let e = null;
        if (isViewObject(elm.j)) {
            e = elm.j.e;
        }
        if (isViewObject(elm)) {
            e = elm.e;
        }
        e &&
            e.on('beforeDestruct', () => {
                store.delete(elm);
            });
    }
    if (value === undefined) {
        return itemStore[key];
    }
    itemStore[key] = value;
    return value;
};
