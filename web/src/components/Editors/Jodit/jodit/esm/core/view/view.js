/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
        r = Reflect.decorate(decorators, target, key, desc);
    else
        for (var i = decorators.length - 1; i >= 0; i--)
            if (d = decorators[i])
                r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var View_1;
import { ViewComponent } from "../component/index.js";
import { Component } from "../component/component.js";
import { STATUSES } from "../component/statuses.js";
import { APP_VERSION, BASE_PATH, ES, IS_ES_MODERN, IS_ES_NEXT } from "../constants.js";
import { Create } from "../create/create.js";
import { cache } from "../decorators/cache/cache.js";
import { derive } from "../decorators/derive/derive.js";
import { hook } from "../decorators/hook/hook.js";
import { Dom } from "../dom/index.js";
import { EventEmitter } from "../event-emitter/index.js";
import { modules } from "../global.js";
import { camelCase, ConfigProto, error, i18n, isDestructable, isFunction, isVoid } from "../helpers/index.js";
import { Storage } from "../storage/storage.js";
import { Elms } from "../traits/elms.js";
import { Mods } from "../traits/mods.js";
import { ProgressBar } from "../ui/progress-bar/progress-bar.js";
import { UIMessages } from "../../modules/messages/messages.js";
let View = View_1 = class View extends Component {
    /**
     * Get a path for loading extra staff
     */
    get basePath() {
        if (this.o.basePath) {
            return this.o.basePath;
        }
        return BASE_PATH;
    }
    /**
     * Return a default timeout period in milliseconds for some debounce or throttle functions.
     * By default, `{history.timeout}` options
     */
    get defaultTimeout() {
        return isVoid(this.o.defaultTimeout) ? 100 : this.o.defaultTimeout;
    }
    /**
     * Some extra data inside editor
     * @see copyformat plugin
     */
    get buffer() {
        return Storage.makeStorage();
    }
    get message() {
        return this.getMessageModule(this.container);
    }
    getMessageModule(container) {
        return new UIMessages(this, container);
    }
    /**
     * Container for persistent set/get value
     */
    get storage() {
        return Storage.makeStorage(true, this.id);
    }
    /**
     * Short alias for `create`
     */
    get c() {
        return this.create;
    }
    get container() {
        return this.__container;
    }
    set container(container) {
        this.__container = container;
    }
    /**
     * Short alias for `events`
     */
    get e() {
        return this.events;
    }
    /**
     * progress_bar Progress bar
     */
    get progressbar() {
        return new ProgressBar(this);
    }
    get options() {
        return this.__options;
    }
    set options(options) {
        this.__options = options;
    }
    /**
     * Short alias for options
     */
    get o() {
        return this.options;
    }
    /**
     * Internationalization method. Uses Jodit.lang object
     */
    i18n(text, ...params) {
        return i18n(text, params, this.options);
    }
    toggleFullSize(isFullSize) {
        if (isFullSize === undefined) {
            isFullSize = !this.__isFullSize;
        }
        if (isFullSize === this.__isFullSize) {
            return;
        }
        this.__isFullSize = isFullSize;
        this.e.fire('toggleFullSize', isFullSize);
    }
    /**
     * View is locked
     */
    get isLocked() {
        return this.__whoLocked !== '';
    }
    /**
     * Disable selecting
     */
    lock(name = 'any') {
        if (!this.isLocked) {
            this.__whoLocked = name;
            return true;
        }
        return false;
    }
    /**
     * Enable selecting
     */
    unlock() {
        if (this.isLocked) {
            this.__whoLocked = '';
            return true;
        }
        return false;
    }
    /**
     * View is in fullSize
     */
    get isFullSize() {
        return this.__isFullSize;
    }
    /**
     * Return current version
     */
    getVersion() {
        return View_1.version;
    }
    static getVersion() {
        return View_1.version;
    }
    /** @override */
    initOptions(options) {
        this.options = ConfigProto(options || {}, ConfigProto(this.options || {}, View_1.defaultOptions));
    }
    /**
     * Can change ownerWindow here
     */
    initOwners() {
        this.ownerWindow = this.o.ownerWindow ?? window;
    }
    /**
     * Add option's event handlers in emitter
     */
    attachEvents(options) {
        if (!options) {
            return;
        }
        const e = options?.events;
        e && Object.keys(e).forEach((key) => this.e.on(key, e[key]));
    }
    constructor(options, isJodit = false) {
        super();
        this.isJodit = isJodit;
        this.isView = true;
        this.parent = null;
        this.mods = {};
        /**
         * All created ViewComponent inside this view
         */
        this.components = new Set();
        this.OPTIONS = View_1.defaultOptions;
        this.__isFullSize = false;
        this.__whoLocked = '';
        this.isLockedNotBy = (name) => this.isLocked && this.__whoLocked !== name;
        this.__modulesInstances = new Map();
        this.id = new Date().getTime().toString();
        this.initOptions(options);
        this.initOwners();
        this.events = new EventEmitter(this.od);
        this.create = new Create(this.od);
        this.container = this.c.div(`jodit ${this.componentName}`);
    }
    getInstance(moduleNameOrConstructor, options) {
        const moduleName = isFunction(moduleNameOrConstructor)
            ? moduleNameOrConstructor.prototype.className()
            : moduleNameOrConstructor;
        const instance = this.e.fire(camelCase('getInstance_' + moduleName), options);
        if (instance) {
            return instance;
        }
        const module = isFunction(moduleNameOrConstructor)
            ? moduleNameOrConstructor
            : modules[moduleName], mi = this.__modulesInstances;
        if (!isFunction(module)) {
            throw error('Need real module name');
        }
        if (!mi.has(moduleName)) {
            const instance = module.prototype instanceof ViewComponent
                ? new module(this, options)
                : new module(options);
            this.components.add(instance);
            mi.set(moduleName, instance);
        }
        return mi.get(moduleName);
    }
    /** Add some element to box */
    addDisclaimer(elm) {
        this.container.appendChild(elm);
    }
    /**
     * Call before destruct
     */
    beforeDestruct() {
        this.e.fire(STATUSES.beforeDestruct, this);
        this.components.forEach(component => {
            if (isDestructable(component) && !component.isInDestruct) {
                component.destruct();
            }
        });
        this.components.clear();
    }
    /** @override */
    destruct() {
        if (this.isDestructed) {
            return;
        }
        this.progressbar.destruct();
        this.message.destruct();
        if (this.events) {
            this.events.destruct();
            // @ts-ignore
            this.events = undefined;
        }
        if (this.buffer) {
            this.buffer.clear();
        }
        Dom.safeRemove(this.container);
        super.destruct();
    }
};
// from webpack.config.js
View.ES = ES;
View.version = APP_VERSION;
View.esNext = IS_ES_NEXT; // from webpack.config.js
View.esModern = IS_ES_MODERN; // from webpack.config.js
__decorate([
    cache
], View.prototype, "buffer", null);
__decorate([
    cache
], View.prototype, "message", null);
__decorate([
    cache
], View.prototype, "storage", null);
__decorate([
    cache
], View.prototype, "c", null);
__decorate([
    cache
], View.prototype, "e", null);
__decorate([
    cache
], View.prototype, "progressbar", null);
__decorate([
    hook(STATUSES.beforeDestruct)
], View.prototype, "beforeDestruct", null);
View = View_1 = __decorate([
    derive(Mods, Elms)
], View);
export { View };
View.defaultOptions = {
    extraButtons: [],
    cache: true,
    textIcons: false,
    namespace: '',
    removeButtons: [],
    zIndex: 100002,
    defaultTimeout: 100,
    fullsize: false,
    showTooltip: true,
    useNativeTooltip: false,
    buttons: [],
    globalFullSize: true,
    language: 'auto'
};
