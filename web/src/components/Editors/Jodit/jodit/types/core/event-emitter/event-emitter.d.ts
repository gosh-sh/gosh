/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:core/event-emitter/README.md]]
 * @packageDocumentation
 * @module event-emitter
 */
import type { CallbackFunction, CanArray, IEventEmitter, IEventEmitterOnOptions } from "../../types";
/**
 * The module editor's event manager
 */
export declare class EventEmitter implements IEventEmitter {
    private __domEventsMap;
    private __mutedEvents;
    mute(event?: string): this;
    isMuted(event?: string): boolean;
    unmute(event?: string): this;
    readonly __key: string;
    private __doc;
    private __eachEvent;
    private __getStore;
    private __removeStoreFromSubject;
    private __prepareEvent;
    private __triggerNativeEvent;
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
    get current(): string;
    currents: string[];
    /**
     * Sets the handler for the specified event ( Event List ) for a given element
     *
     * @example
     * ```javascript
     * // set global handler
     * editor.events.on('beforeCommand', function (command) {
     *     alert('command');
     * });
     * ```
     * * @example
     * ```javascript
     * // set global handler
     * editor.events.on(document.body, 'click', function (e) {
     *     alert(this.href);
     * });
     * ```
     */
    on(events: CanArray<string>, callback: CallbackFunction, options?: IEventEmitterOnOptions): this;
    on(subjects: CanArray<HTMLElement | Window | object>, events: CanArray<string>, callback: CallbackFunction, options?: IEventEmitterOnOptions): this;
    private __memoryDOMSubjectToHandler;
    private __unmemoryDOMSubjectToHandler;
    one(eventsOrSubjects: CanArray<string> | CanArray<HTMLElement | Window | object>, callbackOrEvents: CallbackFunction | CanArray<string>, optionsOrCallback: IEventEmitterOnOptions | CallbackFunction | void, opts?: IEventEmitterOnOptions): this;
    /**
     * Disable all handlers specified event ( Event List ) for a given element. Either a specific event handler.
     *
     * @param subjectOrEvents - The object which is disabled handlers
     * @param eventsOrCallback - List of events, separated by a space or comma , which is necessary
     * to disable the handlers for a given object
     * @param handler - Specific event handler to be removed
     *
     * @example
     * ```javascript
     * var a = {name: "Anton"};
     * parent.e.on(a, 'open', function () {
     *     alert(this.name);
     * });
     *
     * parent.e.fire(a, 'open');
     * parent.e.off(a, 'open');
     * var b = {name: "Ivan"}, hndlr = function () {
     *  alert(this.name);
     * };
     * parent.e.on(b, 'open close', hndlr);
     * parent.e.fire(a, 'open');
     * parent.e.off(a, 'open', hndlr);
     * parent.e.fire(a, 'close');
     * parent.e.on('someGlobalEvents', function () {
     *   console.log(this); // parent
     * });
     * parent.e.fire('someGlobalEvents');
     * parent.e.off('someGlobalEvents');
     * ```
     */
    off(events: CanArray<string>, callback?: CallbackFunction): this;
    off(subjects: CanArray<Window | HTMLElement | object>, events?: CanArray<string>, callback?: CallbackFunction): this;
    /**
     * Stop execute all another listeners for this event
     */
    stopPropagation(events: string): void;
    stopPropagation(subject: object, eventsList: string): void;
    private __stopped;
    private __removeStop;
    private __isStopped;
    /**
     * Emits an event to all handlers and calls them
     *
     * @param subjectOrEvents - The object which is caused by certain events
     * @param eventsList - List of events , separated by a space or comma
     * @param args - Options for the event handler
     * @returns `false` if one of the handlers return `false`
     * @example
     * ```javascript
     * var dialog = new Jodit.modules.Dialog();
     * parent.e.on('afterClose', function () {
     *     dialog.destruct(); // will be removed from DOM
     * });
     * dialog.open('Hello world!!!');
     * ```
     *  or you can trigger native browser listener
     * ```javascript
     *  var events = new Jodit.modules.EventEmitter();
     *  events.on(document.body, 'click',function (event) {
     *      alert('click on ' + event.target.id );
     *  });
     *  events.fire(document.body.querySelector('div'), 'click');
     * ```
     *
     */
    fire(subjectOrEvents: string, ...args: any[]): any;
    fire(subjectOrEvents: object, eventsList: string | Event, ...args: any[]): any;
    private __isDestructed;
    constructor(doc?: Document);
    destruct(): void;
}
