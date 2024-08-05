/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module storage
 */
import type { BooleanFunction, IStorage, StorageValueType } from "../../../types";
/**
 * Check if user disable local storages/cookie etc.
 */
export declare const canUsePersistentStorage: BooleanFunction;
/**
 * Persistent storage in localStorage
 */
export declare class LocalStorageProvider<T = StorageValueType> implements IStorage<T> {
    readonly rootKey: string;
    set(key: string, value: T): IStorage<T>;
    delete(key: string): IStorage<T>;
    get<R = T>(key: string): R | void;
    exists(key: string): boolean;
    constructor(rootKey: string);
    clear(): IStorage<T>;
}
