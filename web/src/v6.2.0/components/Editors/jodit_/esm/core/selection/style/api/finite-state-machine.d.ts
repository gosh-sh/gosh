/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import type { IDictionary } from "../../../../types";
/**
 * A state machine implementation for applying styles.
 */
export declare class FiniteStateMachine<K extends string, V extends object & {
    next: K;
}, T extends IDictionary<IDictionary<(value: V) => V>, K> = IDictionary<IDictionary<(...attrs: any[]) => any>, K>, A extends keyof T[K] = keyof T[K]> {
    private readonly transitions;
    private __state;
    private setState;
    getState(): K;
    private silent;
    disableSilent(): void;
    private __previewsStates;
    constructor(state: K, transitions: T);
    dispatch(actionName: A, value: V): V;
}
