/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { isString } from "../checker/is-string.js";
import { completeUrl } from "./complete-url.js";
const alreadyLoadedList = new Map();
const cacheLoaders = (loader) => {
    return async (jodit, url) => {
        if (alreadyLoadedList.has(url)) {
            return alreadyLoadedList.get(url);
        }
        const promise = loader(jodit, url);
        alreadyLoadedList.set(url, promise);
        return promise;
    };
};
/**
 * Load script and return promise
 */
export const appendScriptAsync = cacheLoaders((jodit, url) => {
    return jodit.async.promise((resolve, reject) => {
        if (jodit.isInDestruct) {
            return reject();
        }
        const script = jodit.c.element('script', {
            type: 'text/javascript',
            async: true,
            src: completeUrl(url)
        });
        jodit.od.body.appendChild(script);
        jodit.e.on(script, 'error', reject).on(script, 'load', resolve);
    });
});
/**
 * Download CSS style script
 */
export const appendStyleAsync = cacheLoaders((jodit, url) => {
    return jodit.async.promise((resolve, reject) => {
        if (jodit.isInDestruct) {
            return reject();
        }
        const link = jodit.c.element('link');
        link.rel = 'stylesheet';
        link.media = 'all';
        link.crossOrigin = 'anonymous';
        const callback = () => resolve(link);
        !jodit.isInDestruct &&
            jodit.e.on(link, 'load', callback).on(link, 'error', reject);
        link.href = completeUrl(url);
        if (jodit.o.shadowRoot) {
            jodit.o.shadowRoot.appendChild(link);
        }
        else {
            jodit.od.body.appendChild(link);
        }
    });
});
export function loadNext(jodit, urls, i = 0) {
    if (!isString(urls[i])) {
        return Promise.resolve();
    }
    return appendScriptAsync(jodit, urls[i]).then(() => loadNext(jodit, urls, i + 1));
}
export function loadNextStyle(jodit, urls, i = 0) {
    if (!isString(urls[i])) {
        return Promise.resolve();
    }
    return appendStyleAsync(jodit, urls[i]).then(() => loadNextStyle(jodit, urls, i + 1));
}
