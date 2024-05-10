/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { pluginSystem } from "../../core/global.js";
export function poweredByJodit(jodit) {
    const { o } = jodit;
    if (!o.hidePoweredByJodit &&
        !o.inline &&
        (o.showCharsCounter ||
            o.showWordsCounter ||
            o.showXPathInStatusbar)) {
        jodit.hookStatus('ready', () => {
            jodit.statusbar.append(jodit.create.fromHTML(`<a
						tabindex="-1"
						style="text-transform: uppercase"
						class="jodit-status-bar-link"
						target="_blank"
						href="https://xdsoft.net/jodit/">
							Powered by Jodit
						</a>`), true);
        });
    }
}
pluginSystem.add('poweredByJodit', poweredByJodit);
