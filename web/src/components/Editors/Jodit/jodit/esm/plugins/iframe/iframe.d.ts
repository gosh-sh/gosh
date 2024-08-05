/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/iframe/README.md]]
 * @packageDocumentation
 * @module plugins/iframe
 */
import type { IJodit } from "../../types";
import "./config";
/**
 * Iframe plugin - use `iframe` instead of DIV in editor. It can be need when you want to attach custom styles in editor
 * in backend of you system
 */
export declare function iframe(editor: IJodit): void;
