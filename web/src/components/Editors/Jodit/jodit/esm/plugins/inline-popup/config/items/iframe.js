/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { align } from "./img.js";
export default [
    {
        name: 'bin',
        tooltip: 'Delete',
        exec: (editor, image) => {
            image && editor.s.removeNode(image);
        }
    },
    align
];
