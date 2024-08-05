/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/link
 */
import type { IJodit, IUIForm, IUIOption } from "../../types";
declare module 'jodit/config' {
    interface Config {
        link: {
            /**
             * Template for the link dialog form
             */
            formTemplate: (editor: IJodit) => string | HTMLElement | IUIForm;
            formClassName?: string;
            /**
             * Follow link address after dblclick
             */
            followOnDblClick: boolean;
            /**
             * Replace inserted youtube/vimeo link to `iframe`
             */
            processVideoLink: boolean;
            /**
             * Wrap inserted link
             */
            processPastedLink: boolean;
            /**
             * Show `no follow` checkbox in link dialog.
             */
            noFollowCheckbox: boolean;
            /**
             * Show `Open in new tab` checkbox in link dialog.
             */
            openInNewTabCheckbox: boolean;
            /**
             * Use an input text to ask the classname or a select or not ask
             */
            modeClassName: 'input' | 'select';
            /**
             * Allow multiple choises (to use with modeClassName="select")
             */
            selectMultipleClassName: boolean;
            /**
             * The size of the select (to use with modeClassName="select")
             */
            selectSizeClassName?: number;
            /**
             * The list of the option for the select (to use with modeClassName="select")
             */
            selectOptionsClassName: IUIOption[];
            hotkeys: string[];
        };
    }
}
