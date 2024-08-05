/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:core/async/README.md]]
 * @packageDocumentation
 * @module async
 */
import type { CallbackFunction, IAsync, IAsyncParams, ITimeout, Nullable, RejectablePromise } from "../../types";
type Callback = (...args: any[]) => void;
export declare class Async implements IAsync {
    private timers;
    private __callbacks;
    delay(timeout: number | IAsyncParams): RejectablePromise<void>;
    setTimeout(callback: Callback, timeout: number | IAsyncParams | undefined, ...args: any[]): number;
    updateTimeout(label: string, timeout: number): Nullable<number>;
    private clearLabel;
    clearTimeout(timer: number): void;
    clearTimeout(label: string): void;
    /**
     * Debouncing enforces that a function not be called again until a certain amount of time has passed without
     * it being called. As in "execute this function only if 100 milliseconds have passed without it being called."
     *
     * @example
     * ```javascript
     * var jodit = Jodit.make('.editor');
     * jodit.e.on('mousemove', jodit.async.debounce(() => {
     * 	// Do expensive things
     * }, 100));
     * ```
     */
    debounce(fn: CallbackFunction, timeout: ITimeout | IAsyncParams, firstCallImmediately?: boolean): CallbackFunction;
    private __queueMicrotaskNative;
    microDebounce<T extends CallbackFunction>(fn: T, firstCallImmediately?: boolean): T;
    /**
     * Throttling enforces a maximum number of times a function can be called over time.
     * As in "execute this function at most once every 100 milliseconds."
     *
     * @example
     * ```javascript
     * var jodit = Jodit.make('.editor');
     * jodit.e.on(document.body, 'scroll', jodit.async.throttle(function() {
     * 	// Do expensive things
     * }, 100));
     * ```
     */
    throttle(fn: CallbackFunction, timeout: ITimeout | IAsyncParams, ignore?: boolean): CallbackFunction;
    private promisesRejections;
    promise<T>(executor: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void): RejectablePromise<T>;
    /**
     * Get Promise status
     */
    promiseState(p: Promise<any>): Promise<'pending' | 'fulfilled' | 'rejected'>;
    private requestsIdle;
    private requestsRaf;
    private requestIdleCallbackNative;
    private __cancelIdleCallbackNative;
    requestIdleCallback(callback: IdleRequestCallback, options?: {
        timeout: number;
    }): number;
    requestIdlePromise(options?: {
        timeout: number;
    }): RejectablePromise<number>;
    cancelIdleCallback(request: number): void;
    requestAnimationFrame(callback: FrameRequestCallback): number;
    cancelAnimationFrame(request: number): void;
    clear(): void;
    isDestructed: boolean;
    destruct(): any;
}
export {};
