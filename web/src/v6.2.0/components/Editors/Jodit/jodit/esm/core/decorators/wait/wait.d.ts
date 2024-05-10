/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:core/decorators/wait/README.md]]
 * @packageDocumentation
 * @module decorators/wait
 */
import type { IViewBased, IViewComponent } from "../../../types";
export declare function wait<T extends IViewBased>(condition: (ctx: T) => boolean): Function;
export declare function wait<T extends IViewComponent>(condition: (ctx: T) => boolean): Function;
