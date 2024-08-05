/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import type { ICommitStyle, IJodit } from "../../../../types";
/**
 * Replaces the parent tag with the applicable one, or wraps the text and also replaces the tag
 * @private
 */
export declare function wrap(commitStyle: ICommitStyle, font: HTMLElement, jodit: IJodit): HTMLElement;
