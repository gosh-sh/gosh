/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { attr } from "../../../../core/helpers/utils/attr.js";
export default [
    {
        name: 'eye',
        tooltip: 'Open link',
        exec: (editor, current) => {
            const href = attr(current, 'href');
            if (current && href) {
                editor.ow.open(href);
            }
        }
    },
    {
        name: 'link',
        tooltip: 'Edit link',
        icon: 'pencil'
    },
    'unlink',
    'brush',
    'file'
];
