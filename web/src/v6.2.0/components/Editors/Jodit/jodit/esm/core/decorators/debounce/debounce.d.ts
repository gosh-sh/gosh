/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:core/decorators/debounce/README.md]]
 * @packageDocumentation
 * @module decorators/debounce
 */
import type { DecoratorHandler, IAsyncParams, IViewComponent } from "../../../types";
export declare function debounce<V extends IViewComponent = IViewComponent>(timeout?: number | ((ctx: V) => number | IAsyncParams) | IAsyncParams, firstCallImmediately?: boolean, method?: 'debounce' | 'throttle'): DecoratorHandler;
/**
 * Wrap function in throttle wrapper
 */
export declare function throttle<V extends IViewComponent = IViewComponent>(timeout?: number | ((ctx: V) => number | IAsyncParams) | IAsyncParams, firstCallImmediately?: boolean): DecoratorHandler;
