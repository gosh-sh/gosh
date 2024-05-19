/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
/**
 * [[include:plugins/image-processor/README.md]]
 * @packageDocumentation
 * @module plugins/image-processor
 */
import type { IJodit } from "../../types";
import { Plugin } from "../../core/plugin";
import "./config";
/**
 * Change editor's size after load all images
 */
export declare class imageProcessor extends Plugin {
    protected afterInit(jodit: IJodit): void;
    protected beforeDestruct(jodit: IJodit): void;
    protected onAfterGetValueFromEditor(data: {
        value: string;
    }, consumer?: string): void;
    protected onBeforeSetElementValue(data: {
        value: string;
    }): void;
    protected afterChange(data: {
        value: string;
    }): Promise<void>;
}
