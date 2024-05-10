/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
export * from "./build-data.js";
export * from "./data-uri-to-blob.js";
export * from "./process-old-browser-drag.js";
export * from "./send.js";
export * from "./send-files.js";
export function hasFiles(data) {
    return Boolean(data && data.files && data.files.length > 0);
}
export function hasItems(data) {
    return Boolean(data && data.items && data.items.length > 0);
}
