/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Icon } from "../../core/ui/icon.js";
import spellcheckIcon from "./spellcheck.svg.js";
import { Config } from "../../config.js";
Config.prototype.spellcheck = false;
Icon.set('spellcheck', spellcheckIcon);
Config.prototype.controls.spellcheck = {
    isActive(e) {
        return e.o.spellcheck;
    },
    icon: spellcheckIcon,
    name: 'spellcheck',
    command: 'toggleSpellcheck',
    tooltip: 'Spellcheck'
};
