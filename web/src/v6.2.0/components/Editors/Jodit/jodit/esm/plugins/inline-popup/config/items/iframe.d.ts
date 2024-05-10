/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module plugins/inline-popup
 */
import type { IJodit } from "../../../../types";
declare const _default: (import("../../../../types").IControlType<IJodit, import("../../../../types").IToolbarButton> | {
    name: string;
    tooltip: string;
    exec: (editor: IJodit, image: HTMLImageElement) => void;
})[];
export default _default;
