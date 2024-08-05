/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:core/storage/README.md]]
 * @packageDocumentation
 * @module storage
 */
import type { IStorage, StorageValueType } from "../../types";
export declare const StorageKey: string;
export declare class Storage<T = StorageValueType> implements IStorage<T> {
    readonly provider: IStorage<T>;
    readonly prefix: string;
    set(key: string, value: T): IStorage<T>;
    delete(key: string): IStorage<T>;
    get<R = T>(key: string): R | void;
    exists(key: string): boolean;
    clear(): IStorage<T>;
    protected constructor(provider: IStorage<T>, suffix?: string);
    static makeStorage(persistent?: boolean, suffix?: string): IStorage;
}
