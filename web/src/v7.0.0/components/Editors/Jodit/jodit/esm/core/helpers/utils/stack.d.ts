/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module helpers/utils
 */
import type { CanUndef } from "../../../types";
export declare class LimitedStack<T> {
    readonly limit: number;
    private stack;
    constructor(limit: number);
    push(item: T): this;
    pop(): CanUndef<T>;
    find(clb: (item: T) => boolean): CanUndef<T>;
}
