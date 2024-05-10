/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { IS_PROD } from "../constants.js";
import { eventEmitter } from "../global.js";
import { splitArray } from "../helpers/array/index.js";
import { isArray, isDestructable, isString } from "../helpers/checker/index.js";
import { init } from "./helpers/init-instance.js";
import { loadExtras } from "./helpers/load.js";
import { makeInstance } from "./helpers/make-instance.js";
import { normalizeName } from "./helpers/utils.js";
import "./interface.js";
/**
 * Jodit plugin system
 * @example
 * ```js
 * Jodit.plugins.add('emoji2', {
 * 	init() {
 *  	alert('emoji Inited2')
 * 	},
 *	destruct() {}
 * });
 * ```
 */
export class PluginSystem {
    constructor() {
        this.__items = new Map();
    }
    /**
     * Add plugin in store
     */
    add(name, plugin) {
        this.__items.set(normalizeName(name), plugin);
        eventEmitter.fire(`plugin:${name}:ready`);
    }
    /**
     * Get plugin from store
     */
    get(name) {
        return this.__items.get(normalizeName(name));
    }
    /**
     * Remove plugin from store
     */
    remove(name) {
        this.__items.delete(normalizeName(name));
    }
    __getFullPluginsList(filter) {
        const results = [];
        this.__items.forEach((plugin, name) => {
            if (!filter || filter.has(name)) {
                results.push([name, plugin]);
            }
        });
        return results;
    }
    /**
     * Public method for async init all plugins
     */
    __init(jodit) {
        const { extraList, disableList, filter } = getSpecialLists(jodit);
        const doneList = new Map();
        const pluginsMap = {};
        const waitingList = new Set();
        jodit.__plugins = pluginsMap;
        const initPlugins = () => {
            if (jodit.isInDestruct) {
                return;
            }
            let commit = false;
            this.__getFullPluginsList(filter).forEach(([name, plugin]) => {
                if (disableList.has(name) || doneList.has(name)) {
                    return;
                }
                const requires = plugin?.requires;
                if (requires && isArray(requires) && requires.length) {
                    if (requires.some(req => disableList.has(req))) {
                        return;
                    }
                    if (!requires.every(name => doneList.has(name))) {
                        waitingList.add(name);
                        return;
                    }
                }
                commit = true;
                const instance = makeInstance(jodit, plugin);
                if (!instance) {
                    doneList.set(name, null);
                    waitingList.delete(name);
                    return;
                }
                init(jodit, name, plugin, instance, doneList, waitingList);
                pluginsMap[name] = instance;
            });
            if (commit) {
                jodit.e.fire('updatePlugins');
                initPlugins();
            }
        };
        if (extraList && extraList.length) {
            loadExtras(this.__items, jodit, extraList, initPlugins);
        }
        initPlugins();
        bindOnBeforeDestruct(jodit, pluginsMap);
        if (!IS_PROD && waitingList.size) {
            console.warn('After init plugin waiting list is not clean:', waitingList);
        }
    }
    /**
     * Returns the promise to wait for the plugin to load.
     */
    wait(name) {
        return new Promise((resolve) => {
            if (this.get(name)) {
                return resolve();
            }
            const onReady = () => {
                resolve();
                eventEmitter.off(`plugin:${name}:ready`, onReady);
            };
            eventEmitter.on(`plugin:${name}:ready`, onReady);
        });
    }
}
/**
 * Destroy all plugins before - Jodit will be destroyed
 */
function bindOnBeforeDestruct(jodit, plugins) {
    jodit.e.on('beforeDestruct', () => {
        Object.keys(plugins).forEach(name => {
            const instance = plugins[name];
            if (isDestructable(instance)) {
                instance.destruct(jodit);
            }
            delete plugins[name];
        });
        delete jodit.__plugins;
    });
}
function getSpecialLists(jodit) {
    const extraList = jodit.o.extraPlugins.map(s => isString(s) ? { name: s } : s);
    const disableList = new Set(splitArray(jodit.o.disablePlugins).map(normalizeName));
    const filter = jodit.o.safeMode ? new Set(jodit.o.safePluginsList) : null;
    return { extraList, disableList, filter };
}
