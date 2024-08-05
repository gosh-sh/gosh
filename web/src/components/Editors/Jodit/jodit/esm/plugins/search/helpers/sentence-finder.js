/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { fuzzySearchIndex } from "../../../core/helpers/string/fuzzy-search-index.js";
export class SentenceFinder {
    constructor(searchIndex = fuzzySearchIndex) {
        this.searchIndex = searchIndex;
        this.queue = [];
        this.value = '';
    }
    add(node) {
        const value = (node.nodeValue ?? '').toLowerCase();
        if (!value.length) {
            return;
        }
        const index = this.value.length;
        this.queue.push({
            startIndex: index,
            endIndex: index + value.length,
            node
        });
        this.value += value;
    }
    ranges(needle, position = 0) {
        const results = [];
        let index = position, len = 0, startQueueIndex = 0;
        // Find all ranges in substring
        do {
            [index, len] = this.searchIndex(needle, this.value, index);
            if (index !== -1) {
                let startContainer, startOffset = 0, endContainer, endOffset = 0;
                for (let i = startQueueIndex; i < this.queue.length; i += 1) {
                    if (!startContainer && this.queue[i].endIndex > index) {
                        startContainer = this.queue[i].node;
                        startOffset = index - this.queue[i].startIndex;
                    }
                    if (startContainer &&
                        this.queue[i].endIndex >= index + len) {
                        endContainer = this.queue[i].node;
                        endOffset = index + len - this.queue[i].startIndex;
                        startQueueIndex = i;
                        break;
                    }
                }
                if (startContainer && endContainer) {
                    results.push({
                        startContainer,
                        startOffset,
                        endContainer,
                        endOffset
                    });
                }
                index += len;
            }
        } while (index !== -1);
        return results.length === 0 ? null : results;
    }
}
