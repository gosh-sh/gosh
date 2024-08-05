/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */

import { Config } from "../../jodit/esm/config.js";

Config.prototype.controls.ol = {
    ...Config.prototype.controls.ol,
    list: {
        default: 'Decimal',
        'lower-alpha': 'Lower Alpha',
        'lower-greek': 'Lower Greek',
        'lower-roman': 'Lower Roman',
        'upper-alpha': 'Upper Alpha',
        'upper-roman': 'Upper Roman'
    }
};
