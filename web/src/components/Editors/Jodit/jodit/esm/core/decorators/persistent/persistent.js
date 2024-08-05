/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { STATUSES } from "../../component/statuses.js";
import { isViewObject } from "../../helpers/checker/is-view-object.js";
export function persistent(target, propertyKey) {
    target.hookStatus(STATUSES.ready, (component) => {
        const jodit = isViewObject(component)
            ? component
            : component.jodit, storageKey = `${jodit.options.namespace}${component.componentName}_prop_${propertyKey}`, initialValue = component[propertyKey];
        Object.defineProperty(component, propertyKey, {
            get() {
                return jodit.storage.get(storageKey) ?? initialValue;
            },
            set(value) {
                jodit.storage.set(storageKey, value);
            }
        });
    });
}
