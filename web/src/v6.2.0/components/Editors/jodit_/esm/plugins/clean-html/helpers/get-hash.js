/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { isString } from "../../../core/helpers/checker/is-string.js";
import { trim } from "../../../core/helpers/string/trim.js";
/**
 * @private
 */
export function getHash(tags) {
    const attributesReg = /([^[]*)\[([^\]]+)]/;
    const separator = /[\s]*,[\s]*/, attrReg = /^(.*)[\s]*=[\s]*(.*)$/;
    const tagsHash = {};
    if (isString(tags)) {
        tags.split(separator).map((elm) => {
            elm = trim(elm);
            const attr = attributesReg.exec(elm), allowAttributes = {}, attributeMap = (attrName) => {
                attrName = trim(attrName);
                const val = attrReg.exec(attrName);
                if (val) {
                    allowAttributes[val[1]] = val[2];
                }
                else {
                    allowAttributes[attrName] = true;
                }
            };
            if (attr) {
                const attr2 = attr[2].split(separator);
                if (attr[1]) {
                    attr2.forEach(attributeMap);
                    tagsHash[attr[1].toUpperCase()] = allowAttributes;
                }
            }
            else {
                tagsHash[elm.toUpperCase()] = true;
            }
        });
        return tagsHash;
    }
    if (tags) {
        Object.keys(tags).forEach(tagName => {
            tagsHash[tagName.toUpperCase()] = tags[tagName];
        });
        return tagsHash;
    }
    return false;
}
