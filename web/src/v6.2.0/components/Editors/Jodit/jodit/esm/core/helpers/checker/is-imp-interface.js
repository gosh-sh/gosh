/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Dom } from "../../dom/dom.js";
import { isFunction } from "./is-function.js";
import { isVoid } from "./is-void.js";
/**
 * Check value has method init
 */
export function isInitable(value) {
    return !isVoid(value) && isFunction(value.init);
}
/**
 * Check value has method destruct
 */
export function isDestructable(value) {
    return !isVoid(value) && isFunction(value.destruct);
}
/**
 * Check value is instant that implements IContainer
 */
export function hasContainer(value) {
    return !isVoid(value) && Dom.isElement(value.container);
}
