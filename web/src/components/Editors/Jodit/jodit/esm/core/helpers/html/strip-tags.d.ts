/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module helpers/html
 */
import type { HTMLTagNames, Nullable } from "../../../types";
/**
 * Extract plain text from HTML text
 */
export declare function stripTags(html: string | Node, doc?: Document, exclude?: Nullable<Set<HTMLTagNames>>): string;
