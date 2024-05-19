/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import type { CommitMode, ICommitStyle, IJodit } from "../../../../../types";
/**
 * Replaces `ul->ol` or `ol->ul`, apply styles to the list, or remove a list item from it
 * @private
 */
export declare function toggleOrderedList(commitStyle: ICommitStyle, li: HTMLElement, jodit: IJodit, mode: CommitMode): CommitMode;
