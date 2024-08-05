/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module event-emitter
 */
import type { CallbackFunction, EventHandlerBlock } from "../../types";
export declare const defaultNameSpace = "JoditEventDefaultNamespace";
export declare class EventHandlersStore {
    private __store;
    get(event: string, namespace: string): EventHandlerBlock[] | void;
    indexOf(event: string, namespace: string, originalCallback: CallbackFunction): false | number;
    namespaces(withoutDefault?: boolean): string[];
    events(namespace: string): string[];
    set(event: string, namespace: string, data: EventHandlerBlock, onTop?: boolean): void;
    clear(): void;
    clearEvents(namespace: string, event: string): void;
    isEmpty(): boolean;
}
