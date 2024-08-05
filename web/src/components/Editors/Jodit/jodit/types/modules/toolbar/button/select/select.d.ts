/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * @module modules/toolbar/button
 */
import type { IViewBased } from "../../../../types";
import { ToolbarButton } from "../button";

export declare class ToolbarSelect<T extends IViewBased = IViewBased> extends ToolbarButton<T> {
    className(): string;
    update(): void;
}
