/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module helpers/checker
 */
import type { IContainer, IDestructible, IInitable } from "../../../types";
/**
 * Check value has method init
 */
export declare function isInitable(value: unknown): value is IInitable;
/**
 * Check value has method destruct
 */
export declare function isDestructable(value: unknown): value is IDestructible;
/**
 * Check value is instant that implements IContainer
 */
export declare function hasContainer(value: unknown): value is IContainer;
