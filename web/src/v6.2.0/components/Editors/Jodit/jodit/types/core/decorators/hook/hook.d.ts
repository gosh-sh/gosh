/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:core/decorators/hook/README.md]]
 * @packageDocumentation
 * @module decorators/hook
 */
import type { ComponentStatus, IDictionary } from "../../../types";
import type { Component } from "../../component";
/**
 * Call on some component status
 */
export declare function hook(status: ComponentStatus): <T extends Component & IDictionary>(target: IDictionary, propertyKey: string) => void;
