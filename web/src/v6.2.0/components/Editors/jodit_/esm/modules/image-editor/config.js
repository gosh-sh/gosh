/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import { Icon } from "../../core/ui/icon.js";
import cropIcon from "./icons/crop.svg.js";
import resizeIcon from "./icons/resize.svg.js";
import { Config } from "../../config.js";
Config.prototype.imageeditor = {
    min_width: 20,
    min_height: 20,
    closeAfterSave: false,
    width: '85%',
    height: '85%',
    crop: true,
    resize: true,
    resizeUseRatio: true,
    resizeMinWidth: 20,
    resizeMinHeight: 20,
    cropUseRatio: true,
    cropDefaultWidth: '70%',
    cropDefaultHeight: '70%'
};
Icon.set('crop', cropIcon).set('resize', resizeIcon);
