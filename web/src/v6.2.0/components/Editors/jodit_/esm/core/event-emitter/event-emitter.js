/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { PASSIVE_EVENTS } from "../constants.js";
import { splitArray } from "../helpers/array/split-array.js";
import { isArray } from "../helpers/checker/is-array.js";
import { isFunction } from "../helpers/checker/is-function.js";
import { isString, isStringArray } from "../helpers/checker/is-string.js";
import { error } from "../helpers/utils/error/index.js";
import { defaultNameSpace, EventHandlersStore } from "./store.js";
/**
 * The module editor's event manager
 */
export class EventEmitter {
    mute(event) {
        this.__mutedEvents.add(event ?? '*');
        return this;
    }
    isMuted(event) {
        if (event && this.__mutedEvents.has(event)) {
            return true;
        }
        return this.__mutedEvents.has('*');
    }
    unmute(event) {
        this.__mutedEvents.delete(event ?? '*');
        return this;
    }
    __eachEvent(events, callback) {
        const eventParts = splitArray(events).map(e => e.trim());
        eventParts.forEach(eventNameSpace => {
            const eventAndNameSpace = eventNameSpace.split('.');
            const namespace = eventAndNameSpace[1] || defaultNameSpace;
            callback.call(this, eventAndNameSpace[0], namespace);
        });
    }
    __getStore(subject) {
        if (!subject) {
            throw error('Need subject');
        }
        if (subject[this.__key] === undefined) {
            const store = new EventHandlersStore();
            Object.defineProperty(subject, this.__key, {
                enumerable: false,
                configurable: true,
                writable: true,
                value: store
            });
        }
        return subject[this.__key];
    }
    __removeStoreFromSubject(subject) {
        if (subject[this.__key] !== undefined) {
            Object.defineProperty(subject, this.__key, {
                enumerable: false,
                configurable: true,
                writable: true,
                value: undefined
            });
        }
    }
    __triggerNativeEvent(element, event) {
        const evt = this.__doc.createEvent('HTMLEvents');
        if (isString(event)) {
            evt.initEvent(event, true, true);
        }
        else {
            evt.initEvent(event.type, event.bubbles, event.cancelable);
            [
                'screenX',
                'screenY',
                'clientX',
                'clientY',
                'target',
                'srcElement',
                'currentTarget',
                'timeStamp',
                'which',
                'keyCode'
            ].forEach(property => {
                Object.defineProperty(evt, property, {
                    value: event[property],
                    enumerable: true
                });
            });
            Object.defineProperty(evt, 'originalEvent', {
                value: event,
                enumerable: true
            });
        }
        element.dispatchEvent(evt);
    }
    /**
     * Get current event name
     *
     * @example
     * ```javascript
     * parent.e.on('openDialog closeDialog', function () {
     *     if (parent.e.current === 'closeDialog') {
     *         alert('Dialog was closed');
     *     } else {
     *         alert('Dialog was opened');
     *     }
     * });
     * ```
     */
    get current() {
        return this.currents[this.currents.length - 1];
    }
    on(eventsOrSubjects, callbackOrEvents, optionsOrCallback, opts) {
        let subjects;
        let events;
        let callback;
        let options;
        if (isString(eventsOrSubjects) || isStringArray(eventsOrSubjects)) {
            subjects = this;
            events = eventsOrSubjects;
            callback = callbackOrEvents;
            options = optionsOrCallback;
        }
        else {
            subjects = eventsOrSubjects;
            events = callbackOrEvents;
            callback = optionsOrCallback;
            options = opts;
        }
        if (!(isString(events) || isStringArray(events)) ||
            events.length === 0) {
            throw error('Need events names');
        }
        if (!isFunction(callback)) {
            throw error('Need event handler');
        }
        if (isArray(subjects)) {
            subjects.forEach(subj => {
                this.on(subj, events, callback, options);
            });
            return this;
        }
        const subject = subjects;
        const store = this.__getStore(subject);
        const self = this;
        let syntheticCallback = function (event, ...args) {
            if (self.isMuted(event)) {
                return;
            }
            return callback && callback.call(this, ...args);
        };
        if (isDOMElement(subject)) {
            syntheticCallback = function (event) {
                if (self.isMuted(event.type)) {
                    return;
                }
                self.__prepareEvent(event);
                if (callback && callback.call(this, event) === false) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    return false;
                }
                return;
            };
        }
        this.__eachEvent(events, (event, namespace) => {
            if (event.length === 0) {
                throw error('Need event name');
            }
            if (store.indexOf(event, namespace, callback) === false) {
                const block = {
                    event,
                    originalCallback: callback,
                    syntheticCallback
                };
                store.set(event, namespace, block, options?.top);
                if (isDOMElement(subject)) {
                    const eOpts = PASSIVE_EVENTS.has(event)
                        ? {
                            passive: true,
                            capture: options?.capture ?? false
                        }
                        : options?.capture ?? false;
                    syntheticCallback.options = eOpts;
                    subject.addEventListener(event, syntheticCallback, eOpts);
                    this.__memoryDOMSubjectToHandler(subject, syntheticCallback);
                }
            }
        });
        return this;
    }
    __memoryDOMSubjectToHandler(subject, syntheticCallback) {
        const callbackStore = this.__domEventsMap.get(subject) || new Set();
        callbackStore.add(syntheticCallback);
        this.__domEventsMap.set(subject, callbackStore);
    }
    __unmemoryDOMSubjectToHandler(subject, syntheticCallback) {
        const m = this.__domEventsMap;
        const callbackStore = m.get(subject) || new Set();
        callbackStore.delete(syntheticCallback);
        if (callbackStore.size) {
            m.set(subject, callbackStore);
        }
        else {
            m.delete(subject);
        }
    }
    one(eventsOrSubjects, callbackOrEvents, optionsOrCallback, opts) {
        let subjects;
        let events;
        let callback;
        let options;
        if (isString(eventsOrSubjects) || isStringArray(eventsOrSubjects)) {
            subjects = this;
            events = eventsOrSubjects;
            callback = callbackOrEvents;
            options = optionsOrCallback;
        }
        else {
            subjects = eventsOrSubjects;
            events = callbackOrEvents;
            callback = optionsOrCallback;
            options = opts;
        }
        const newCallback = (...args) => {
            this.off(subjects, events, newCallback);
            return callback(...args);
        };
        this.on(subjects, events, newCallback, options);
        return this;
    }
    off(eventsOrSubjects, callbackOrEvents, handler) {
        let subjects;
        let events;
        let callback;
        if (isString(eventsOrSubjects) || isStringArray(eventsOrSubjects)) {
            subjects = this;
            events = eventsOrSubjects;
            callback = callbackOrEvents;
        }
        else {
            subjects = eventsOrSubjects;
            events = callbackOrEvents;
            callback = handler;
        }
        if (isArray(subjects)) {
            subjects.forEach(subj => {
                this.off(subj, events, callback);
            });
            return this;
        }
        const subject = subjects;
        const store = this.__getStore(subject);
        if (!(isString(events) || isStringArray(events)) ||
            events.length === 0) {
            store.namespaces().forEach((namespace) => {
                this.off(subject, '.' + namespace);
            });
            this.__removeStoreFromSubject(subject);
            return this;
        }
        const removeEventListener = (block) => {
            if (isDOMElement(subject)) {
                subject.removeEventListener(block.event, block.syntheticCallback, block.syntheticCallback.options ?? false);
                this.__unmemoryDOMSubjectToHandler(subject, block.syntheticCallback);
            }
        }, removeCallbackFromNameSpace = (event, namespace) => {
            if (event === '') {
                store.events(namespace).forEach((eventName) => {
                    if (eventName !== '') {
                        removeCallbackFromNameSpace(eventName, namespace);
                    }
                });
                return;
            }
            const blocks = store.get(event, namespace);
            if (!blocks || !blocks.length) {
                return;
            }
            if (!isFunction(callback)) {
                blocks.forEach(removeEventListener);
                blocks.length = 0;
                store.clearEvents(namespace, event);
            }
            else {
                const index = store.indexOf(event, namespace, callback);
                if (index !== false) {
                    removeEventListener(blocks[index]);
                    blocks.splice(index, 1);
                    if (!blocks.length) {
                        store.clearEvents(namespace, event);
                    }
                }
            }
        };
        this.__eachEvent(events, (event, namespace) => {
            if (namespace === defaultNameSpace) {
                store.namespaces().forEach(namespace => {
                    removeCallbackFromNameSpace(event, namespace);
                });
            }
            else {
                removeCallbackFromNameSpace(event, namespace);
            }
        });
        if (store.isEmpty()) {
            this.__removeStoreFromSubject(subject);
        }
        return this;
    }
    stopPropagation(subjectOrEvents, eventsList) {
        const subject = isString(subjectOrEvents)
            ? this
            : subjectOrEvents;
        const events = isString(subjectOrEvents)
            ? subjectOrEvents
            : eventsList;
        if (typeof events !== 'string') {
            throw error('Need event names');
        }
        const store = this.__getStore(subject);
        this.__eachEvent(events, (event, namespace) => {
            const blocks = store.get(event, namespace);
            if (blocks) {
                this.__stopped.push(blocks);
            }
            if (namespace === defaultNameSpace) {
                store
                    .namespaces(true)
                    .forEach(ns => this.stopPropagation(subject, event + '.' + ns));
            }
        });
    }
    __removeStop(currentBlocks) {
        if (currentBlocks) {
            const index = this.__stopped.indexOf(currentBlocks);
            index !== -1 && this.__stopped.splice(0, index + 1);
        }
    }
    __isStopped(currentBlocks) {
        return (currentBlocks !== undefined &&
            this.__stopped.indexOf(currentBlocks) !== -1);
    }
    fire(subjectOrEvents, eventsList, ...args) {
        let result, result_value;
        const subject = isString(subjectOrEvents)
            ? this
            : subjectOrEvents;
        const events = isString(subjectOrEvents)
            ? subjectOrEvents
            : eventsList;
        const argumentsList = isString(subjectOrEvents)
            ? [eventsList, ...args]
            : args;
        if (!isDOMElement(subject) && !isString(events)) {
            throw error('Need events names');
        }
        const store = this.__getStore(subject);
        if (!isString(events) && isDOMElement(subject)) {
            this.__triggerNativeEvent(subject, eventsList);
        }
        else {
            this.__eachEvent(events, (event, namespace) => {
                if (isDOMElement(subject)) {
                    this.__triggerNativeEvent(subject, event);
                }
                else {
                    const blocks = store.get(event, namespace);
                    if (blocks) {
                        try {
                            [...blocks].every((block) => {
                                if (this.__isStopped(blocks)) {
                                    return false;
                                }
                                this.currents.push(event);
                                result_value =
                                    block.syntheticCallback.call(subject, event, ...argumentsList);
                                this.currents.pop();
                                if (result_value !== undefined) {
                                    result = result_value;
                                }
                                return true;
                            });
                        }
                        finally {
                            this.__removeStop(blocks);
                        }
                    }
                    if (namespace === defaultNameSpace &&
                        !isDOMElement(subject)) {
                        store
                            .namespaces()
                            .filter(ns => ns !== namespace)
                            .forEach((ns) => {
                            const result_second = this.fire.apply(this, [
                                subject,
                                event + '.' + ns,
                                ...argumentsList
                            ]);
                            if (result_second !== undefined) {
                                result = result_second;
                            }
                        });
                    }
                }
            });
        }
        return result;
    }
    constructor(doc) {
        this.__domEventsMap = new Map();
        this.__mutedEvents = new Set();
        this.__key = '__JoditEventEmitterNamespaces';
        this.__doc = document;
        this.__prepareEvent = (e) => {
            if (e.cancelBubble) {
                return;
            }
            // for Shadow Dom
            if (e.composed && isFunction(e.composedPath) && e.composedPath()[0]) {
                Object.defineProperty(e, 'target', {
                    value: e.composedPath()[0],
                    configurable: true,
                    enumerable: true
                });
            }
            if (e.type.match(/^touch/) &&
                e.changedTouches &&
                e.changedTouches.length) {
                ['clientX', 'clientY', 'pageX', 'pageY'].forEach((key) => {
                    Object.defineProperty(e, key, {
                        value: e.changedTouches[0][key],
                        configurable: true,
                        enumerable: true
                    });
                });
            }
            if (!e.originalEvent) {
                e.originalEvent = e;
            }
            if (e.type === 'paste' &&
                e.clipboardData === undefined &&
                this.__doc.defaultView.clipboardData) {
                Object.defineProperty(e, 'clipboardData', {
                    get: () => {
                        return this.__doc.defaultView.clipboardData;
                    },
                    configurable: true,
                    enumerable: true
                });
            }
        };
        this.currents = [];
        this.__stopped = [];
        this.__isDestructed = false;
        if (doc) {
            this.__doc = doc;
        }
        this.__key += new Date().getTime();
    }
    destruct() {
        if (this.__isDestructed) {
            return;
        }
        this.__isDestructed = true;
        this.__domEventsMap.forEach((set, elm) => {
            this.off(elm);
        });
        this.__domEventsMap.clear();
        this.__mutedEvents.clear();
        this.currents.length = 0;
        this.__stopped.length = 0;
        this.off(this);
        this.__getStore(this).clear();
        this.__removeStoreFromSubject(this);
    }
}
function isDOMElement(subject) {
    return isFunction(subject.addEventListener);
}
