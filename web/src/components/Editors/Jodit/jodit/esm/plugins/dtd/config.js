/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Config } from "../../config.js";
Config.prototype.dtd = {
    removeExtraBr: true,
    checkBlockNesting: true,
    blockLimits: {
        article: 1,
        aside: 1,
        audio: 1,
        body: 1,
        caption: 1,
        details: 1,
        dir: 1,
        div: 1,
        dl: 1,
        fieldset: 1,
        figcaption: 1,
        figure: 1,
        footer: 1,
        form: 1,
        header: 1,
        hgroup: 1,
        main: 1,
        menu: 1,
        nav: 1,
        ol: 1,
        section: 1,
        table: 1,
        td: 1,
        th: 1,
        tr: 1,
        ul: 1,
        video: 1
    }
};
