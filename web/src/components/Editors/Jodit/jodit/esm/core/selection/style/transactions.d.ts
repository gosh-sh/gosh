/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module selection
 */
import type { CommitMode, ICommitStyle, IDictionary, IJodit } from "../../../types";
export declare const states: {
    readonly START: "START";
    readonly ELEMENT: "ELEMENT";
    readonly UNWRAP: "UNWRAP";
    readonly UNWRAP_CHILDREN: "UNWRAP_CHILDREN";
    readonly CHANGE: "CHANGE";
    readonly REPLACE_DEFAULT: "REPLACE_DEFAULT";
    readonly LIST: "LIST";
    readonly TOGGLE_LIST: "TOGGLE_LIST";
    readonly WRAP: "WRAP";
    readonly EXTRACT: "EXTRACT";
    readonly END: "END";
};
export interface IStyleTransactionValue {
    next: keyof typeof states;
    element: HTMLElement;
    style: ICommitStyle;
    jodit: IJodit;
    mode: CommitMode;
    collapsed: boolean;
}
type IStyleTransactions = IDictionary<IDictionary<(value: IStyleTransactionValue) => IStyleTransactionValue>, keyof typeof states>;
export declare const transactions: IStyleTransactions;
export {};
