/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * If the HTML has CSS rules with selectors,
 * it applies them to the selectors in the HTML itself
 * and then removes the selector styles, leaving only the inline ones.
 */
export declare function applyStyles(html: string): string;
