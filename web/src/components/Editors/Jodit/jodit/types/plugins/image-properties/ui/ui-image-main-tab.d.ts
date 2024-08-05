/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */
import type { IJodit } from "../../../types";
import { UIGroup } from "../../../core/ui/group/group";
import type { ImagePropertiesAPI, ImagePropertiesState } from "../interface";
/** @private */
export declare class UIImageMainTab extends UIGroup<IJodit> {
    private state;
    private handlers;
    className(): string;
    appendChildToContainer(): void;
    constructor(view: IJodit, state: ImagePropertiesState, handlers: ImagePropertiesAPI);
    protected render(): string;
    protected onStateImageSrcChange(): Promise<void>;
    protected onImageSrcChange(): void;
    /**
     * Open image editor
     */
    protected onEditImageClick(e: MouseEvent): void;
    /**
     * Open popup with filebrowser/uploader buttons for image
     */
    protected onChangeImageClick(e: MouseEvent): void;
    protected onStateTitleChange(): void;
    protected onTitleChange(): void;
    protected onStateAltChange(): void;
    protected onAltChange(): void;
    protected onStateImageLinkChange(): void;
    protected onImageLinkChange(): void;
    protected onStateImageLinkOpenInNewTabChange(): void;
    protected onImageLinkOpenInNewTabChange(): void;
    protected hideFieldByOptions(): void;
}
