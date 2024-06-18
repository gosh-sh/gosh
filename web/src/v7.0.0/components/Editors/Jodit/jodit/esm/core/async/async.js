/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { IS_ES_NEXT } from "../constants.js";
import { clearTimeout, setTimeout } from "../helpers/async/index.js";
import { isAbortError } from "../helpers/checker/is-abort-error.js";
import { isFunction } from "../helpers/checker/is-function.js";
import { isNumber } from "../helpers/checker/is-number.js";
import { isPlainObject } from "../helpers/checker/is-plain-object.js";
import { isPromise } from "../helpers/checker/is-promise.js";
import { isString } from "../helpers/checker/is-string.js";
import { isVoid } from "../helpers/checker/is-void.js";
import { assert } from "../helpers/utils/assert.js";
import { abort } from "../helpers/utils/error/errors/abort-error.js";
export class Async {
    constructor() {
        this.timers = new Map();
        this.__callbacks = new Map();
        this.__queueMicrotaskNative = queueMicrotask?.bind(window) ??
            Promise.resolve().then.bind(Promise.resolve());
        this.promisesRejections = new Set();
        this.requestsIdle = new Set();
        this.requestsRaf = new Set();
        this.requestIdleCallbackNative = window['requestIdleCallback']?.bind(window) ??
            ((callback, options) => {
                const start = Date.now();
                return this.setTimeout(() => {
                    callback({
                        didTimeout: false,
                        timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
                    });
                }, options?.timeout ?? 1);
            });
        this.__cancelIdleCallbackNative = window['cancelIdleCallback']?.bind(window) ??
            ((request) => {
                this.clearTimeout(request);
            });
        this.isDestructed = false;
    }
    delay(timeout) {
        return this.promise(resolve => this.setTimeout(resolve, timeout));
    }
    setTimeout(callback, timeout, ...args) {
        if (this.isDestructed) {
            return 0;
        }
        let options = {};
        if (isVoid(timeout)) {
            timeout = 0;
        }
        if (!isNumber(timeout)) {
            options = timeout;
            timeout = options.timeout || 0;
        }
        if (options.label) {
            this.clearLabel(options.label);
        }
        const timer = setTimeout(callback, timeout, ...args), key = options.label || timer;
        this.timers.set(key, timer);
        this.__callbacks.set(key, callback);
        return timer;
    }
    updateTimeout(label, timeout) {
        assert(label && this.timers.has(label), 'Label does not exist');
        if (!label || !this.timers.has(label)) {
            return null;
        }
        const callback = this.__callbacks.get(label);
        assert(isFunction(callback), 'Callback is not a function');
        return this.setTimeout(callback, { label, timeout });
    }
    clearLabel(label) {
        if (label && this.timers.has(label)) {
            clearTimeout(this.timers.get(label));
            this.timers.delete(label);
            this.__callbacks.delete(label);
        }
    }
    clearTimeout(timerOrLabel) {
        if (isString(timerOrLabel)) {
            return this.clearLabel(timerOrLabel);
        }
        clearTimeout(timerOrLabel);
        this.timers.delete(timerOrLabel);
        this.__callbacks.delete(timerOrLabel);
    }
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
    debounce(fn, timeout, firstCallImmediately = false) {
        let timer = 0, fired = false;
        const promises = [];
        const callFn = (...args) => {
            if (!fired) {
                timer = 0;
                const res = fn(...args);
                fired = true;
                if (promises.length) {
                    const runPromises = () => {
                        promises.forEach(res => res());
                        promises.length = 0;
                    };
                    isPromise(res) ? res.finally(runPromises) : runPromises();
                }
            }
        };
        const onFire = (...args) => {
            fired = false;
            if (!timeout) {
                callFn(...args);
            }
            else {
                if (!timer && firstCallImmediately) {
                    callFn(...args);
                }
                clearTimeout(timer);
                timer = this.setTimeout(() => callFn(...args), isFunction(timeout) ? timeout() : timeout);
                this.timers.set(fn, timer);
            }
        };
        return isPlainObject(timeout) && timeout.promisify
            ? (...args) => {
                const promise = this.promise(res => {
                    promises.push(res);
                }).catch((e) => {
                    if (isAbortError(e)) {
                        return null;
                    }
                    throw e;
                });
                onFire(...args);
                return promise;
            }
            : onFire;
    }
    microDebounce(fn, firstCallImmediately = false) {
        let scheduled = false;
        let needCall = true;
        let savedArgs;
        return ((...args) => {
            savedArgs = args;
            if (scheduled) {
                needCall = true;
                return;
            }
            needCall = true;
            if (firstCallImmediately) {
                needCall = false;
                fn(...savedArgs);
            }
            scheduled = true;
            this.__queueMicrotaskNative(() => {
                scheduled = false;
                if (this.isDestructed) {
                    return;
                }
                needCall && fn(...savedArgs);
            });
        });
    }
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
    throttle(fn, timeout, ignore = false) {
        let timer = null, needInvoke, callee, lastArgs;
        return (...args) => {
            needInvoke = true;
            lastArgs = args;
            if (!timeout) {
                fn(...lastArgs);
                return;
            }
            if (!timer) {
                callee = () => {
                    if (needInvoke) {
                        fn(...lastArgs);
                        needInvoke = false;
                        timer = this.setTimeout(callee, isFunction(timeout) ? timeout() : timeout);
                        this.timers.set(callee, timer);
                    }
                    else {
                        timer = null;
                    }
                };
                callee();
            }
        };
    }
    promise(executor) {
        let rejectCallback = () => { };
        const promise = new Promise((resolve, reject) => {
            rejectCallback = () => reject(abort('Abort async'));
            this.promisesRejections.add(rejectCallback);
            executor(resolve, reject);
        });
        if (!promise.finally && typeof process !== 'undefined' && !IS_ES_NEXT) {
            promise.finally = (onfinally) => {
                promise.then(onfinally).catch(onfinally);
                return promise;
            };
        }
        promise
            .finally(() => {
            this.promisesRejections.delete(rejectCallback);
        })
            .catch(() => null);
        promise.rejectCallback = rejectCallback;
        return promise;
    }
    /**
     * Get Promise status
     */
    promiseState(p) {
        if (p.status) {
            return p.status;
        }
        // Hi IE11
        if (!Promise.race) {
            return new Promise(resolve => {
                p.then(v => {
                    resolve('fulfilled');
                    return v;
                }, e => {
                    resolve('rejected');
                    throw e;
                });
                this.setTimeout(() => {
                    resolve('pending');
                }, 100);
            });
        }
        const t = {};
        return Promise.race([p, t]).then(v => (v === t ? 'pending' : 'fulfilled'), () => 'rejected');
    }
    requestIdleCallback(callback, options) {
        const request = this.requestIdleCallbackNative(callback, options);
        this.requestsIdle.add(request);
        return request;
    }
    requestIdlePromise(options) {
        return this.promise(res => {
            const request = this.requestIdleCallback(() => res(request), options);
        });
    }
    cancelIdleCallback(request) {
        this.requestsIdle.delete(request);
        return this.__cancelIdleCallbackNative(request);
    }
    requestAnimationFrame(callback) {
        const request = requestAnimationFrame(callback);
        this.requestsRaf.add(request);
        return request;
    }
    cancelAnimationFrame(request) {
        this.requestsRaf.delete(request);
        cancelAnimationFrame(request);
    }
    clear() {
        this.requestsIdle.forEach(key => this.cancelIdleCallback(key));
        this.requestsRaf.forEach(key => this.cancelAnimationFrame(key));
        this.timers.forEach(key => clearTimeout(this.timers.get(key)));
        this.timers.clear();
        this.promisesRejections.forEach(reject => reject());
        this.promisesRejections.clear();
    }
    destruct() {
        this.clear();
        this.isDestructed = true;
    }
}
