/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Icon } from "../../core/ui/icon.js";
import "./interface.js";
import searchIcon from "./search.svg.js";
import { Config } from "../../config.js";
Config.prototype.useSearch = true;
Config.prototype.search = {
    lazyIdleTimeout: 0,
    // @ts-ignore Because Highlight is not defined in the types TS 5.3.3
    useCustomHighlightAPI: typeof window.Highlight !== 'undefined'
};
Icon.set('search', searchIcon);
Config.prototype.controls.find = {
    tooltip: 'Find',
    icon: 'search',
    exec(jodit, _, { control }) {
        const value = control.args && control.args[0];
        switch (value) {
            case 'findPrevious':
                jodit.e.fire('searchPrevious');
                break;
            case 'findNext':
                jodit.e.fire('searchNext');
                break;
            case 'replace':
                jodit.execCommand('openReplaceDialog');
                break;
            default:
                jodit.execCommand('openSearchDialog');
        }
    },
    list: {
        search: 'Find',
        findNext: 'Find Next',
        findPrevious: 'Find Previous',
        replace: 'Replace'
    },
    childTemplate: (_, k, v) => v
};
