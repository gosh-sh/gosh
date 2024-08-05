/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:core/decorators/idle/README.md]]
 * @packageDocumentation
 * @module decorators/idle
 */
import type { DecoratorHandler, IComponent } from "../../../types";
export declare function idle<V extends IComponent = IComponent>(): DecoratorHandler;
