/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:core/decorators/watch/README.md]]
 * @packageDocumentation
 * @module decorators/watch
 */
import type { CanUndef, DecoratorHandler, IDictionary } from "../../../types";
export declare function getPropertyDescriptor(obj: unknown, prop: string): CanUndef<PropertyDescriptor>;
/**
 * Watch decorator. Added observer for some change in field value
 */
export declare function watch(observeFields: string[] | string, opts?: {
    context?: object | ((c: IDictionary) => object);
    immediately?: boolean;
}): DecoratorHandler;
