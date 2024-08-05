/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module global
 */
import type { HTMLTagNames, IDictionary, IJodit, IViewBased, IViewComponent } from "../types";
import { PluginSystem } from "./plugin/plugin-system";
import { EventEmitter } from "./event-emitter";
export declare const instances: IDictionary<IJodit>;
/**
 * Generate global unique uid
 */
export declare function uniqueUid(): string;
export declare const pluginSystem: PluginSystem;
export declare const modules: IDictionary<Function>;
export declare const extendLang: (langs: IDictionary) => void;
/**
 * Create unique box(HTMLCotainer) and remove it after destroy
 */
export declare function getContainer<T extends HTMLTagNames = HTMLTagNames>(jodit: IViewBased | IViewComponent, classFunc?: Function | string, tag?: T, createInsideEditor?: boolean): HTMLElementTagNameMap[T];
/**
 * Global event emitter
 */
export declare const eventEmitter: EventEmitter;
