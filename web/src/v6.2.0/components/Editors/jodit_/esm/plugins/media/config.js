/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/media
 */
import { Config } from "../../config.js";
Config.prototype.mediaFakeTag = 'jodit-media';
Config.prototype.mediaInFakeBlock = true;
Config.prototype.mediaBlocks = ['video', 'audio'];
